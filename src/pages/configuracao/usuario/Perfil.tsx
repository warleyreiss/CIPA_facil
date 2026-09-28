import {
  Component,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ErrorInfo,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Panel } from 'primereact/panel';
import { InputText } from 'primereact/inputtext';
import { FloatLabel } from 'primereact/floatlabel';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Message } from 'primereact/message';
import { supabase } from '../../../lib/supabaseClient';
import { useProjeto } from '../../../contexts/ProjetoContext';
import {
  formatarTelefoneWhatsApp,
  normalizarTelefoneWhatsApp,
  telefoneWhatsAppOpcionalValido,
} from '../../../lib/telefoneUtils';
import { appUrl } from '../../../lib/appUrl';
import LinkAjudaSuporte from '../../../components/LinkAjudaSuporte';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/cn';
import type { SuporteTemaSlug } from '../../../lib/suporteTemas';

type ProjetoVinculado = {
  funcao: string;
  projetoNome: string;
};

function asText(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

function severityFuncao(funcao: string): 'success' | 'info' | 'warn' | 'secondary' {
  const f = (funcao || '').toUpperCase();
  if (f === 'GESTOR') return 'success';
  if (f === 'COLABORADOR') return 'info';
  if (f === 'PROPRIETARIO' || f === 'PROPRIETÁRIO') return 'warn';
  return 'secondary';
}

interface ConfigSectionProps {
  icon: string;
  title: string;
  description: string;
  temaAjuda: SuporteTemaSlug;
  defaultCollapsed?: boolean;
  children: ReactNode;
}

function ConfigSection({
  icon,
  title,
  description,
  temaAjuda,
  defaultCollapsed = false,
  children,
}: ConfigSectionProps) {
  const headerTemplate = (options: { collapsed?: boolean; onTogglerClick: (e: MouseEvent) => void }) => {
    const aberto = !options.collapsed;
    return (
      <button
        type="button"
        className={cn('config-index__toggle', aberto && 'is-open')}
        onClick={options.onTogglerClick}
        aria-expanded={aberto}
      >
        <span className="config-index__toggle-icon" aria-hidden>
          <i className={icon} />
        </span>
        <span className="config-index__toggle-copy">
          <span className="config-index__toggle-title">{title}</span>
          <span className="config-index__toggle-desc">{description}</span>
        </span>
        <i
          className={cn('pi config-index__toggle-chevron', aberto ? 'pi-angle-up' : 'pi-angle-down')}
          aria-hidden
        />
      </button>
    );
  };

  return (
    <Panel
      headerTemplate={headerTemplate}
      toggleable
      collapsed={defaultCollapsed}
      className="config-index__panel"
    >
      <div className="config-index__body">
        {children}
        <footer className="config-index__section-foot">
          <LinkAjudaSuporte tema={temaAjuda} />
        </footer>
      </div>
    </Panel>
  );
}

class PerfilBoundary extends Component<{ children: ReactNode }, { erro: Error | null }> {
  state: { erro: Error | null } = { erro: null };

  static getDerivedStateFromError(erro: Error) {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('[Perfil] crash:', erro, info.componentStack);
  }

  render() {
    if (this.state.erro) {
      return (
        <div className="config-index" style={{ padding: '1rem' }}>
          <Message
            severity="error"
            text={`Falha ao abrir o perfil: ${this.state.erro.message}`}
            className="w-full"
          />
          <div className="config-actions config-actions--end" style={{ marginTop: '0.75rem' }}>
            <Button
              label="Tentar de novo"
              icon="pi pi-refresh"
              outlined
              onClick={() => this.setState({ erro: null })}
            />
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function PerfilConteudo() {
  const { userData, inicializarUsuario } = useProjeto();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(userData?.id ?? null);
  const [email, setEmail] = useState(asText(userData?.email));
  const [nomeCompleto, setNomeCompleto] = useState(asText(userData?.nome_completo));
  const [telefone, setTelefone] = useState(formatarTelefoneWhatsApp(asText(userData?.telefone)));
  const [fotoUrl, setFotoUrl] = useState<string | null>(userData?.foto_url ? asText(userData.foto_url) : null);
  const [socialLogin, setSocialLogin] = useState(false);
  const [projetos, setProjetos] = useState<ProjetoVinculado[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let vivo = true;

    (async () => {
      setLoading(true);
      setErro(null);
      try {
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser();
        if (authErr || !user) throw new Error('Usuário não autenticado.');
        if (!vivo) return;

        setUserId(user.id);
        setEmail(user.email || '');
        setSocialLogin(Boolean(user.app_metadata?.provider && user.app_metadata.provider !== 'email'));

        const { data: row, error: userErr } = await supabase
          .from('usuarios')
          .select('nome_completo, telefone, foto_url')
          .eq('id', user.id)
          .maybeSingle();
        if (userErr) throw userErr;

        if (vivo && row) {
          setNomeCompleto(asText(row.nome_completo));
          setTelefone(formatarTelefoneWhatsApp(asText(row.telefone)));
          setFotoUrl(row.foto_url ? asText(row.foto_url) : null);
        } else if (vivo && userData) {
          setNomeCompleto(asText(userData.nome_completo));
          setTelefone(formatarTelefoneWhatsApp(asText(userData.telefone)));
          setFotoUrl(userData.foto_url ? asText(userData.foto_url) : null);
        }

        const { data: membros, error: memErr } = await supabase
          .from('membro_projetos')
          .select('funcao, projetos (nome)')
          .eq('usuario_id', user.id)
          .eq('status', true);

        if (memErr) {
          console.warn('[Perfil] vínculos:', memErr.message);
          if (vivo) setProjetos([]);
        } else if (vivo) {
          setProjetos(
            (membros ?? []).map((m) => {
              const rel = m.projetos as { nome: string } | { nome: string }[] | null;
              const proj = Array.isArray(rel) ? rel[0] ?? null : rel;
              return {
                funcao: asText(m.funcao) || '—',
                projetoNome: proj?.nome || '—',
              };
            }),
          );
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Erro ao carregar perfil.';
        if (vivo) {
          setErro(msg);
          toast.show({ severity: 'error', summary: 'Erro ao carregar', detail: msg });
        }
      } finally {
        if (vivo) setLoading(false);
      }
    })();

    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const salvar = async () => {
    if (!userId) return;
    const nome = nomeCompleto.trim();
    if (!nome) {
      toast.show({ severity: 'error', summary: 'Campo obrigatório', detail: 'Informe o nome completo.' });
      return;
    }
    if (!telefoneWhatsAppOpcionalValido(telefone)) {
      toast.show({
        severity: 'error',
        summary: 'Telefone inválido',
        detail: 'Use o formato +55 (11) 99999-8888.',
      });
      return;
    }
    setSaving(true);
    try {
      const tel = telefone.trim() ? normalizarTelefoneWhatsApp(telefone) : null;
      const { error } = await supabase
        .from('usuarios')
        .update({ nome_completo: nome, telefone: tel })
        .eq('id', userId);
      if (error) throw error;
      setNomeCompleto(nome);
      setTelefone(formatarTelefoneWhatsApp(tel || ''));
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && inicializarUsuario) await inicializarUsuario(user, true, true);
      toast.show({ severity: 'success', summary: 'Sucesso', detail: 'Perfil atualizado com sucesso!' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar perfil.';
      toast.show({ severity: 'error', summary: 'Erro ao salvar', detail: msg });
    } finally {
      setSaving(false);
    }
  };

  const redefinirSenha = async () => {
    if (socialLogin) {
      toast.show({
        severity: 'warn',
        summary: 'Indisponível',
        detail: 'Contas com login social devem redefinir a senha pelo provedor (Google, etc.).',
      });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: appUrl('/definir-senha'),
      });
      if (error) throw error;
      toast.show({
        severity: 'success',
        summary: 'Sucesso',
        detail: 'E-mail de redefinição enviado com sucesso!',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao enviar e-mail.';
      toast.show({ severity: 'error', summary: 'Erro', detail: msg });
    } finally {
      setSaving(false);
    }
  };

  const uploadFoto = async (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${userId}/avatar_${Date.now()}.${ext}`;
    try {
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: updErr } = await supabase.from('usuarios').update({ foto_url: publicUrl }).eq('id', userId);
      if (updErr) throw updErr;
      setFotoUrl(publicUrl);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && inicializarUsuario) await inicializarUsuario(user, true, true);
      toast.show({ severity: 'success', summary: 'Sucesso', detail: 'Foto de perfil atualizada!' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro no upload.';
      toast.show({ severity: 'error', summary: 'Erro no upload', detail: msg });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const telInvalido = Boolean(telefone) && !telefoneWhatsAppOpcionalValido(telefone);

  return (
    <div className="config-index">
      <header className="config-index__hero">
        <div>
          <p className="config-index__kicker">Conta</p>
          <h1 className="config-index__title">Meu perfil</h1>
          <p className="config-index__subtitle">
            Gerencie foto, dados de contato, senha e projetos vinculados à sua conta — no mesmo padrão das
            configurações do projeto.
          </p>
        </div>
        
      </header>

      {erro ? (
        <Message
          severity="error"
          className="w-full"
          content={
            <div className="flex align-items-center justify-content-between gap-2 w-full flex-wrap">
              <span>{erro}</span>
              <Button
                label="Recarregar"
                icon="pi pi-refresh"
                size="small"
                text
                onClick={() => setTick((t) => t + 1)}
              />
            </div>
          }
        />
      ) : null}

      {loading ? (
        <p className="config-block__hint" style={{ margin: 0 }}>
          <i className="pi pi-spin pi-spinner mr-2" aria-hidden />
          Carregando dados da conta…
        </p>
      ) : null}

      <div className="config-index__sections">
        <ConfigSection
          icon="pi pi-user"
          title="Dados da conta"
          description="Foto, nome, telefone e redefinição de senha da sua conta."
          temaAjuda="primeiros_passos"
        >
          <div className="config-dados">
            <div className="config-dados__layout">
              <aside className="config-block config-logo config-perfil__aside">
                <header className="config-block__head">
                  <h3 className="config-block__title">Foto de perfil</h3>
                </header>

                <div className="config-logo__preview config-perfil__avatar-wrap">
                  {fotoUrl ? (
                    <img
                      src={fotoUrl}
                      alt="Foto de perfil"
                      className="config-logo__img config-perfil__avatar"
                    />
                  ) : (
                    <div className="config-logo__placeholder config-perfil__avatar" aria-hidden>
                      <i className="pi pi-user" />
                    </div>
                  )}
                  <Button
                    icon={uploading ? 'pi pi-spin pi-spinner' : 'pi pi-camera'}
                    className="p-button-rounded p-button-sm p-button-success config-logo__upload"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading || loading}
                    tooltip="Alterar foto"
                    tooltipOptions={{ position: 'top' }}
                    aria-label="Alterar foto"
                  />
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={uploadFoto}
                    className="hidden"
                  />
                </div>

                <div className="config-perfil__identity">
                  <p className="config-perfil__name">{nomeCompleto || 'Usuário'}</p>
                  <p className="config-perfil__email">{email || '—'}</p>
                </div>

                <p className="config-logo__hint">PNG ou JPG · o e-mail não pode ser alterado aqui</p>

                {socialLogin ? (
                  <>
                    <hr className="config-dados__sep" />
                    <p className="config-block__hint" style={{ margin: 0 }}>
                      Login social ativo — a senha é gerenciada pelo provedor (Google, etc.).
                    </p>
                  </>
                ) : null}
              </aside>

              <div className="config-dados__main">
                <section className="config-block">
                  <header className="config-block__head">
                    <h3 className="config-block__title">Informações pessoais</h3>
                    <p className="config-block__hint">Nome e telefone usados na conta</p>
                  </header>

                  <div className="config-block__body">
                    <div className="field">
                      <FloatLabel>
                        <InputText
                          id="perfil_nome"
                          value={nomeCompleto}
                          onChange={(e) => setNomeCompleto(e.target.value)}
                          onBlur={(e) => setNomeCompleto(e.target.value.trim())}
                          className="w-full"
                          disabled={loading}
                          autoComplete="name"
                        />
                        <label htmlFor="perfil_nome">Nome completo</label>
                      </FloatLabel>
                    </div>

                    <div className="field">
                      <FloatLabel>
                        <InputText
                          id="perfil_telefone"
                          value={telefone}
                          onChange={(e) => setTelefone(formatarTelefoneWhatsApp(e.target.value))}
                          className={cn('w-full', telInvalido && 'p-invalid')}
                          disabled={loading}
                          inputMode="tel"
                          autoComplete="tel"
                          aria-invalid={telInvalido}
                        />
                        <label htmlFor="perfil_telefone">Telefone / WhatsApp</label>
                      </FloatLabel>
                      <small className="config-block__hint">Formato: +55 (11) 99999-8888</small>
                      {telInvalido ? (
                        <small className="p-error">Informe um WhatsApp válido.</small>
                      ) : null}
                    </div>

                    <div className="field">
                      <FloatLabel>
                        <InputText id="perfil_email" value={email || ''} className="w-full" disabled />
                        <label htmlFor="perfil_email">E-mail da conta</label>
                      </FloatLabel>
                      <small className="config-block__hint">
                        O e-mail corporativo não pode ser alterado pelo perfil.
                      </small>
                    </div>
                  </div>
                </section>

                <div className="config-actions config-actions--end">
                  <Button
                    label="Redefinir senha"
                    icon="pi pi-key"
                    outlined
                    onClick={() => void redefinirSenha()}
                    disabled={socialLogin || loading || saving}
                  />
                  <Button
                    label={saving ? 'Salvando…' : 'Salvar alterações'}
                    icon="pi pi-save"
                    onClick={() => void salvar()}
                    loading={saving}
                    disabled={loading || !userId}
                  />
                </div>
              </div>
            </div>
          </div>
        </ConfigSection>

        <ConfigSection
          icon="pi pi-briefcase"
          title="Projetos e permissões"
          description="Ambientes ativos vinculados à sua conta e a função em cada um."
          temaAjuda="convidar_usuario"
          defaultCollapsed
        >
          <section className="config-block">
            <header className="config-block__head">
              <h3 className="config-block__title">Vínculos ativos</h3>
              <p className="config-block__hint">Projetos em que você participa</p>
            </header>

            {projetos.length === 0 ? (
              <p className="config-block__hint" style={{ margin: 0 }}>
                {loading ? 'Carregando vínculos…' : 'Você não está vinculado a nenhum projeto ativo.'}
              </p>
            ) : (
              <div className="config-block__body" style={{ overflowX: 'auto' }}>
                <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '0.45rem 0.35rem',
                          borderBottom: '1px solid var(--border)',
                          color: 'var(--text-4)',
                          fontSize: '0.68rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Projeto
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '0.45rem 0.35rem',
                          borderBottom: '1px solid var(--border)',
                          color: 'var(--text-4)',
                          fontSize: '0.68rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Função
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {projetos.map((row, i) => (
                      <tr key={`${row.projetoNome}-${row.funcao}-${i}`}>
                        <td
                          style={{
                            padding: '0.55rem 0.35rem',
                            borderBottom: '1px solid var(--border)',
                            fontWeight: 650,
                          }}
                        >
                          {row.projetoNome}
                        </td>
                        <td style={{ padding: '0.55rem 0.35rem', borderBottom: '1px solid var(--border)' }}>
                          <Tag value={row.funcao} severity={severityFuncao(row.funcao)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </ConfigSection>
      </div>
    </div>
  );
}

export default function Perfil() {
  return (
    <PerfilBoundary>
      <PerfilConteudo />
    </PerfilBoundary>
  );
}
