import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { FloatLabel } from 'primereact/floatlabel';
import { Toast } from 'primereact/toast';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Tag } from 'primereact/tag';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { cn as classNames } from '../../lib/cn';
import { useProjeto } from '../../contexts/ProjetoContext';
import { projetoService } from '../../lib/projetoService';
import { supabase } from '../../lib/supabaseClient';
import { appUrl } from '../../lib/appUrl';
import ConfigAccessNotice from '../../components/config/ConfigAccessNotice';
import { TableActionButton, TableRowActions } from '../../components/tables/TableRowActions';
import { emailValido, formatarEmailDigitacao } from '../../lib/telefoneUtils';

type AcaoEmail = {
  tipo: 'reativar' | 'reenviar' | 'ja_ativo' | 'outro_tenant';
  usuarioId: string;
  mensagem: string;
} | null;

export default function UsuariosColaboradores() {
  const { assinatura, funcaoUsuario } = useProjeto();
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reenviandoId, setReenviandoId] = useState<string | null>(null);
  const [exibirFormulario, setExibirFormulario] = useState(false);
  const [edicaoId, setEdicaoId] = useState<string | null>(null);
  const [usuarioLogadoId, setUsuarioLogadoId] = useState<string | null>(null);
  const [acaoEmail, setAcaoEmail] = useState<AcaoEmail>(null);

  const [formData, setFormData] = useState({ nome: '', email: '', projeto_ids: [] as string[], funcao: 'COLABORADOR' });
  const [erros, setErros] = useState<{ [key: string]: string }>({});
  const toast = useRef<Toast>(null);
  const isGestor = funcaoUsuario === 'GESTOR';

  const opcoesFuncao = [
    { label: 'Gestor', value: 'GESTOR' },
    { label: 'Colaborador', value: 'COLABORADOR' }
  ];

  const authHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;
  };

  useEffect(() => {
    const obterUsuarioSessao = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUsuarioLogadoId(user.id);
    };
    obterUsuarioSessao();
    if (assinatura?.id) { carregarColaboradores(); carregarProjetos(); }
  }, [assinatura]);

  const carregarColaboradores = async () => {
    const data = await projetoService.getColaboradores(assinatura.id);
    const usuariosAgrupados: any[] = [];
    const registrosFiltrados = data.filter((item: any) => item.status === true);
    registrosFiltrados.forEach((item: any) => {
      const existente = usuariosAgrupados.find(u => u.usuario_id === item.usuario_id);
      const statusCadastro = item.usuarios?.status_cadastro;
      if (existente) {
        existente.projeto_ids.push(item.projeto_id);
        existente.nomes_projetos.push(item.projetos?.nome || 'Sem nome');
      } else {
        usuariosAgrupados.push({
          usuario_id: item.usuario_id, usuarios: item.usuarios, funcao: item.funcao, status: item.status,
          status_cadastro: statusCadastro, is_pending: statusCadastro === 'PENDENTE',
          projeto_ids: [item.projeto_id], nomes_projetos: [item.projetos?.nome || 'Sem nome']
        });
      }
    });
    setColaboradores(usuariosAgrupados);
  };

  const carregarProjetos = async () => {
    try {
      const resultado = await supabase.from('projetos').select('id, nome').eq('assinatura_id', assinatura.id);
      if (!resultado.error && resultado.data) setProjetos(resultado.data);
    } catch (err) { console.error("Erro ao carregar projetos:", err); }
  };

  const validarFormulario = (): boolean => {
    const novosErros: { [key: string]: string } = {};
    if (!formData.nome.trim()) novosErros.nome = 'O nome completo é obrigatório.';
    if (!formData.email.trim()) novosErros.email = 'O e-mail é obrigatório.';
    else if (!emailValido(formData.email)) novosErros.email = 'Insira um formato de e-mail válido.';
    if (!formData.projeto_ids || formData.projeto_ids.length === 0) {
      novosErros.projeto_ids = 'Selecione pelo menos um projeto para vincular.';
    }
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const abrirNovoCadastro = () => {
    setEdicaoId(null);
    setFormData({ nome: '', email: '', projeto_ids: [], funcao: 'COLABORADOR' });
    setErros({});
    setAcaoEmail(null);
    setExibirFormulario(true);
  };

  const handleSelecionarLinha = (e: any) => {
    const colaboradorItem = e.data;
    setEdicaoId(colaboradorItem.usuario_id);
    setErros({});
    setAcaoEmail(null);
    setFormData({
      nome: (colaboradorItem.usuarios?.nome_completo || '').trim(),
      email: formatarEmailDigitacao(colaboradorItem.usuarios?.email || ''),
      projeto_ids: colaboradorItem.projeto_ids || [],
      funcao: colaboradorItem.funcao || 'COLABORADOR',
    });
    setExibirFormulario(true);
  };

  const enviarLinkAtivacao = async (emailDestino: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(emailDestino, {
      redirectTo: appUrl('/definir-senha'),
    });
    if (error) throw error;
  };

  const handleResetPassword = async () => {
    setLoading(true);
    try {
      await enviarLinkAtivacao(formData.email.trim().toLowerCase());
      toast.current?.show({ severity: 'success', summary: 'Sucesso', detail: 'E-mail de redefinição enviado com sucesso!' });
    } catch (err: any) {
      toast.current?.show({ severity: 'error', summary: 'Erro', detail: err.message || 'Erro ao enviar e-mail.' });
    } finally { setLoading(false); }
  };

  const processarErroServidor = async (error: any): Promise<string> => {
    let mensagemBruta = 'Falha ao processar requisição no servidor.';
    if (error.context && typeof error.context.text === 'function') {
      try {
        const textoDoCorpo = await error.context.text();
        try {
          const jsonDoCorpo = JSON.parse(textoDoCorpo);
          mensagemBruta = jsonDoCorpo?.error || jsonDoCorpo?.message || jsonDoCorpo?.msg || textoDoCorpo;
        } catch { if (textoDoCorpo) mensagemBruta = textoDoCorpo; }
      } catch { /* noop */ }
    } else if (error.message) { mensagemBruta = error.message; }

    const erroMinusculo = mensagemBruta.toLowerCase();
    if (erroMinusculo.includes('email_address_invalid') || erroMinusculo.includes('invalid email') || erroMinusculo.includes('format'))
      return 'O e-mail ou o domínio informado é inválido ou não possui servidores de recebimento ativos.';
    if (erroMinusculo.includes('already exists') || erroMinusculo.includes('already registered') || erroMinusculo.includes('já possui'))
      return 'Este endereço de e-mail já possui uma conta ou convite ativo na plataforma.';
    if (erroMinusculo.includes('rate') || erroMinusculo.includes('limit'))
      return 'Limite de e-mails atingido. Aguarde alguns minutos e tente novamente.';
    return mensagemBruta;
  };

  const handleReativarVinculo = async () => {
    if (!acaoEmail || acaoEmail.tipo !== 'reativar') return;
    if (!validarFormulario()) return;
    setLoading(true);
    try {
      await projetoService.reativarOuVincularColaborador({
        usuarioId: acaoEmail.usuarioId,
        assinaturaId: assinatura.id,
        projetoIds: formData.projeto_ids,
        funcao: formData.funcao,
      });
      if (acaoEmail.mensagem.toLowerCase().includes('pendente')) {
        try {
          await enviarLinkAtivacao(formData.email.trim().toLowerCase());
          toast.current?.show({
            severity: 'success',
            summary: 'Membro reativado',
            detail: 'Vínculos atualizados e novo link de ativação enviado.',
            life: 7000,
          });
        } catch {
          toast.current?.show({
            severity: 'warn',
            summary: 'Reativado sem e-mail',
            detail: 'Vínculos atualizados, mas o reenvio do link falhou. Use “Reenviar” na lista.',
            life: 8000,
          });
        }
      } else {
        toast.current?.show({
          severity: 'success',
          summary: 'Membro reativado',
          detail: 'O colaborador voltou a ter acesso nos projetos selecionados.',
        });
      }
      setAcaoEmail(null);
      setExibirFormulario(false);
      await carregarColaboradores();
    } catch (err: any) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erro ao reativar',
        detail: err.message || 'Não foi possível reativar o vínculo.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReenviarDaAcao = async () => {
    if (!acaoEmail || (acaoEmail.tipo !== 'reenviar' && acaoEmail.tipo !== 'outro_tenant')) return;
    setLoading(true);
    try {
      await enviarLinkAtivacao(formData.email.trim().toLowerCase());
      toast.current?.show({
        severity: 'success',
        summary: 'Convite reenviado',
        detail: 'Enviamos um novo link de ativação para o e-mail informado.',
        life: 6000,
      });
      setAcaoEmail(null);
      setExibirFormulario(false);
      await carregarColaboradores();
    } catch (err: any) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erro ao reenviar',
        detail: err.message || 'Não foi possível reenviar o link.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    if (!validarFormulario()) return;
    setLoading(true);
    setAcaoEmail(null);
    const emailSanitizado = formData.email.trim().toLowerCase();
    const payloadEnvio = { ...formData, email: emailSanitizado, assinatura_id: assinatura.id };

    if (edicaoId) {
      try {
        await supabase.from('membro_projetos').delete().eq('usuario_id', edicaoId).eq('assinatura_id', assinatura.id);
        const novosVinculos = formData.projeto_ids.map(pId => ({ assinatura_id: assinatura.id, usuario_id: edicaoId, projeto_id: pId, funcao: formData.funcao, status: true }));
        const { error } = await supabase.from('membro_projetos').insert(novosVinculos);
        if (error) throw error;
        toast.current?.show({ severity: 'success', detail: 'Projetos do colaborador atualizados!' });
        carregarColaboradores();
        setExibirFormulario(false);
      } catch (err: any) {
        toast.current?.show({ severity: 'error', summary: 'Erro de Atualização', detail: err.message || 'Erro ao atualizar projetos.' });
      }
      setLoading(false);
      return;
    }

    try {
      const consulta = await projetoService.consultarEmailEquipe(emailSanitizado, assinatura.id);

      if (consulta.existe) {
        if (consulta.temVinculoAtivo) {
          if (consulta.pendente) {
            setErros((prev) => ({
              ...prev,
              email: 'Já existe um convite PENDENTE para este e-mail nesta assinatura.',
            }));
            setAcaoEmail({
              tipo: 'reenviar',
              usuarioId: consulta.usuario.id,
              mensagem: 'Reenvie o link de ativação para o colaborador definir a senha.',
            });
          } else {
            setErros((prev) => ({
              ...prev,
              email: 'Este e-mail já está ativo na sua equipe.',
            }));
            setAcaoEmail({
              tipo: 'ja_ativo',
              usuarioId: consulta.usuario.id,
              mensagem: 'Abra o membro na lista para alterar projetos ou resetar senha.',
            });
          }
          setLoading(false);
          return;
        }

        if (consulta.temVinculoInativo) {
          setErros((prev) => ({
            ...prev,
            email: 'Este e-mail já foi convidado e está inativo nesta assinatura.',
          }));
          setAcaoEmail({
            tipo: 'reativar',
            usuarioId: consulta.usuario.id,
            mensagem: consulta.pendente
              ? 'Reative o vínculo (status ainda PENDENTE) e enviaremos um novo link.'
              : 'Reative o vínculo nos projetos selecionados — não é necessário novo convite Auth.',
          });
          setLoading(false);
          return;
        }

        // Existe em usuarios, mas sem vínculo nesta assinatura (possível outro tenant / órfão)
        setErros((prev) => ({
          ...prev,
          email: 'Este e-mail já está cadastrado na plataforma.',
        }));
        setAcaoEmail({
          tipo: 'outro_tenant',
          usuarioId: consulta.usuario.id,
          mensagem: consulta.pendente
            ? 'Há um cadastro PENDENTE. Se for da sua equipe, use “Reenviar link”. Caso contrário, o e-mail não pode ser reconvidado.'
            : 'O e-mail já pertence a outra conta. Use outro endereço ou peça ao suporte se for o mesmo colaborador.',
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('quick-api', {
        body: payloadEnvio,
        headers: await authHeaders(),
      });

      if (error) {
        const mensagemAmigavel = await processarErroServidor(error);
        const jaExiste = mensagemAmigavel.toLowerCase().includes('já possui') || mensagemAmigavel.toLowerCase().includes('already');
        toast.current?.show({
          severity: 'error',
          summary: 'E-mail Recusado',
          detail: mensagemAmigavel,
          life: 8000,
        });
        if (jaExiste) {
          setErros((prev) => ({ ...prev, email: mensagemAmigavel }));
          setAcaoEmail({
            tipo: 'reenviar',
            usuarioId: '',
            mensagem: 'Se o convite estiver PENDENTE na lista, use “Reenviar”. Se estiver inativo, tente o e-mail de novo após escolher projetos e use a ação de reativar.',
          });
        }
      } else if (data?.error) {
        toast.current?.show({
          severity: 'error',
          summary: 'E-mail Recusado',
          detail: String(data.error),
          life: 8000,
        });
      } else {
        toast.current?.show({
          severity: 'success',
          summary: 'Convite enviado',
          detail: 'O colaborador receberá um e-mail com link para definir a senha e ativar a conta.',
          life: 7000,
        });
        carregarColaboradores();
        setExibirFormulario(false);
      }
    } catch (err: any) {
      toast.current?.show({ severity: 'error', summary: 'Erro Inesperado', detail: err.message || 'Erro de rede ou comunicação.' });
    }
    setLoading(false);
  };

  const handleInativar = (usuarioId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    confirmDialog({
      header: 'Inativar colaborador',
      message: 'O acesso será removido dos projetos. O e-mail continuará cadastrado — você poderá reativá-lo depois pelo formulário de convite.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Inativar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        setLoading(true);
        try {
          await projetoService.inativarColaborador(usuarioId, assinatura.id);
          toast.current?.show({ severity: 'success', summary: 'Inativado', detail: 'Colaborador sem acesso aos projetos.' });
          await carregarColaboradores();
        } catch (err: any) {
          toast.current?.show({
            severity: 'error',
            summary: 'Erro ao inativar',
            detail: err.message || 'Não foi possível inativar.',
          });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleReenviarConvite = async (row: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const emailDestino = row.usuarios?.email?.trim().toLowerCase();
    if (!emailDestino) {
      toast.current?.show({
        severity: 'error',
        summary: 'E-mail ausente',
        detail: 'Não foi possível identificar o e-mail do convite. Atualize a página ou verifique o cadastro.',
      });
      return;
    }
    setReenviandoId(row.usuario_id);
    try {
      // Usuário Auth já existe (PENDENTE): inviteUserByEmail falha.
      // Recovery envia e-mail com link para /definir-senha (mesma ativação).
      await enviarLinkAtivacao(emailDestino);
      toast.current?.show({
        severity: 'success',
        summary: 'Convite reenviado',
        detail: 'Enviamos um novo link de ativação para o e-mail do colaborador.',
        life: 6000,
      });
    } catch (err: any) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erro ao reenviar',
        detail: err.message || 'Não foi possível reenviar o link.',
      });
    }
    setReenviandoId(null);
  };

  const statusBodyTemplate = (rowData: any) => {
    const statusCadastro = rowData.usuarios?.status_cadastro || rowData.status_cadastro;
    if (statusCadastro === 'PENDENTE' || rowData.is_pending) {
      return <Tag severity="warning" value="PENDENTE" icon="pi pi-clock" />;
    }
    return rowData.status ? (
      <Tag severity="success" value="ATIVO" icon="pi pi-check" />
    ) : (
      <Tag severity="danger" value="INATIVO" icon="pi pi-ban" />
    );
  };

  const acoesBodyTemplate = (row: any) => {
    if (row.usuario_id === usuarioLogadoId) return <span className="text-sm text-color-secondary font-medium">Você</span>;
    if (row.is_pending) {
      return (
        <TableRowActions>
          <TableActionButton icon="pi pi-refresh" tooltip="Reenviar E-mail de Convite" className="p-button-warning" onClick={(e) => handleReenviarConvite(row, e)} loading={reenviandoId === row.usuario_id} disabled={!!reenviandoId || loading} />
        </TableRowActions>
      );
    }
    return (
      <TableRowActions>
        <TableActionButton icon="pi pi-ban" tooltip="Inativar Colaborador" className="p-button-danger" onClick={(e) => handleInativar(row.usuario_id, e)} disabled={!row.status || loading} />
      </TableRowActions>
    );
  };

  return (
    <>
      <Toast ref={toast} />
      <ConfirmDialog />

      {!isGestor && (
        <ConfigAccessNotice title="Visualização da equipe" message="Você pode consultar os membros vinculados. Convites e alterações são exclusivos de gestores." />
      )}

      <div className="config-equipe__toolbar">
        {isGestor && !exibirFormulario ? (
          <Button
            label="Convidar colaborador"
            icon="pi pi-plus"
            className="p-button-success p-button-sm"
            onClick={abrirNovoCadastro}
          />
        ) : (
          <span />
        )}
      </div>

      {exibirFormulario && isGestor && (
        <section className="config-block config-equipe__form">
          <header className="config-block__head">
            <h3 className="config-block__title">
              {edicaoId ? `Alterar projetos · ${formData.nome}` : 'Convidar colaborador'}
            </h3>
          </header>

          <div className="config-grid">
            <div className="field">
              <FloatLabel>
                <InputText
                  id="nome_usuario"
                  value={formData.nome}
                  disabled={!!edicaoId}
                  className={classNames('w-full', { 'p-invalid': !!erros.nome })}
                  onChange={(e) => {
                    setFormData({ ...formData, nome: e.target.value });
                    if (erros.nome) setErros((prev) => ({ ...prev, nome: '' }));
                  }}
                  onBlur={(e) =>
                    setFormData((prev) => ({ ...prev, nome: e.target.value.trim() }))
                  }
                />
                <label htmlFor="nome_usuario">Nome completo</label>
              </FloatLabel>
              {erros.nome && <small className="p-error">{erros.nome}</small>}
            </div>

            <div className="field">
              <FloatLabel>
                <InputText
                  id="email_usuario"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={formData.email}
                  disabled={!!edicaoId}
                  className={classNames('w-full', { 'p-invalid': !!erros.email })}
                  onChange={(e) => {
                    setFormData({ ...formData, email: formatarEmailDigitacao(e.target.value) });
                    setAcaoEmail(null);
                    if (erros.email) setErros((prev) => ({ ...prev, email: '' }));
                  }}
                />
                <label htmlFor="email_usuario">E-mail</label>
              </FloatLabel>
              {erros.email && <small className="p-error">{erros.email}</small>}
              {acaoEmail && (
                <div className="config-equipe__email-acao" role="status">
                  <p className="config-equipe__email-acao-msg">{acaoEmail.mensagem}</p>
                  <div className="flex gap-2 flex-wrap">
                    {acaoEmail.tipo === 'reativar' && (
                      <Button
                        type="button"
                        label="Reativar vínculo"
                        icon="pi pi-user-plus"
                        className="p-button-sm p-button-warning"
                        loading={loading}
                        onClick={handleReativarVinculo}
                      />
                    )}
                    {acaoEmail.tipo === 'reenviar' && (
                      <Button
                        type="button"
                        label="Reenviar link de ativação"
                        icon="pi pi-send"
                        className="p-button-sm p-button-warning"
                        loading={loading}
                        onClick={handleReenviarDaAcao}
                      />
                    )}
                    {acaoEmail.tipo === 'ja_ativo' && (
                      <Button
                        type="button"
                        label="Fechar e ver lista"
                        icon="pi pi-list"
                        className="p-button-sm p-button-outlined"
                        onClick={() => {
                          setExibirFormulario(false);
                          setAcaoEmail(null);
                        }}
                      />
                    )}
                    {acaoEmail.tipo === 'outro_tenant' && acaoEmail.mensagem.toLowerCase().includes('pendente') && (
                      <Button
                        type="button"
                        label="Tentar reenviar link"
                        icon="pi pi-send"
                        className="p-button-sm p-button-outlined p-button-warning"
                        loading={loading}
                        onClick={handleReenviarDaAcao}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="field">
              <FloatLabel>
                <MultiSelect
                  inputId="projeto_ids_usuario"
                  value={formData.projeto_ids}
                  options={projetos}
                  optionLabel="nome"
                  optionValue="id"
                  maxSelectedLabels={3}
                  className={classNames('w-full', { 'p-invalid': !!erros.projeto_ids })}
                  onChange={(e) => setFormData({ ...formData, projeto_ids: e.value })}
                />
                <label htmlFor="projeto_ids_usuario">Projetos vinculados</label>
              </FloatLabel>
              {erros.projeto_ids && <small className="p-error">{erros.projeto_ids}</small>}
            </div>

            <div className="field">
              <FloatLabel>
                <Dropdown
                  inputId="funcao_usuario"
                  value={formData.funcao}
                  options={opcoesFuncao}
                  className="w-full"
                  onChange={(e) => setFormData({ ...formData, funcao: e.value })}
                />
                <label htmlFor="funcao_usuario">Nível de acesso</label>
              </FloatLabel>
            </div>
          </div>

          <div className="config-actions config-actions--end">
            <div className="flex gap-2">
              {edicaoId && (
                <Button
                  label="Resetar senha"
                  icon="pi pi-lock"
                  severity="warning"
                  outlined
                  onClick={handleResetPassword}
                  loading={loading}
                  disabled={!!reenviandoId}
                />
              )}
              <Button
                label="Cancelar"
                icon="pi pi-times"
                severity="secondary"
                text
                onClick={() => {
                  setExibirFormulario(false);
                  setAcaoEmail(null);
                }}
              />
              <Button
                label={edicaoId ? 'Salvar alterações' : 'Enviar convite'}
                icon="pi pi-check"
                loading={loading}
                onClick={handleSalvar}
                disabled={!!reenviandoId || (!!acaoEmail && acaoEmail.tipo !== 'outro_tenant')}
              />
            </div>
          </div>
        </section>
      )}

      <DataTable
        value={colaboradores}
        className={classNames('p-datatable-sm p-datatable-gridlines', isGestor && 'datatable-row--clickable')}
        selectionMode="single"
        onRowClick={isGestor ? handleSelecionarLinha : undefined}
        emptyMessage="Nenhum colaborador vinculado à assinatura."
        paginator
        rows={10}
        rowsPerPageOptions={[10, 20, 50]}
        rowHover
      >
        <Column field="usuarios.nome_completo" header="Nome" sortable body={(row) => row.usuarios?.nome_completo || '—'} />
        <Column field="usuarios.email" header="E-mail" sortable body={(row) => row.usuarios?.email || '—'} />
        <Column header="Projetos Ativos" body={(row) => row.nomes_projetos?.length ? row.nomes_projetos.join(', ') : 'Nenhum'} />
        <Column field="funcao" header="Função" body={(row) => row.funcao || 'COLABORADOR'} sortable />
        <Column header="Status" body={statusBodyTemplate} style={{ width: '8rem' }} />
        {isGestor && <Column header="Ações" body={acoesBodyTemplate} style={{ width: '6rem' }} />}
      </DataTable>
    </>
  );
}
