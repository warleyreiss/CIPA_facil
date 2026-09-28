import { useCallback, useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { comunicadoService } from '../lib/comunicadoService';
import type { ComunicadoSistema } from '../types/types';
import LinkAjudaSuporte from './LinkAjudaSuporte';

interface ModalComunicadoSistemaProps {
  usuarioId: string | null | undefined;
  pausado?: boolean;
  planoTipo?: string | null;
  assinaturaTipo?: string | null;
}

const ICONES_TIPO: Record<string, string> = {
  info: 'pi-info-circle',
  aviso: 'pi-exclamation-circle',
  manutencao: 'pi-wrench',
  critico: 'pi-exclamation-triangle',
};

const SEVERIDADE_TIPO: Record<string, 'info' | 'warning' | 'danger' | 'success'> = {
  info: 'info',
  aviso: 'warning',
  manutencao: 'warning',
  critico: 'danger',
};

const COR_TIPO: Record<string, string> = {
  info: 'var(--blue-500)',
  aviso: 'var(--orange-500)',
  manutencao: 'var(--yellow-600)',
  critico: 'var(--red-500)',
};

export default function ModalComunicadoSistema({
  usuarioId,
  pausado = false,
  planoTipo = null,
  assinaturaTipo = null,
}: ModalComunicadoSistemaProps) {
  const [fila, setFila] = useState<ComunicadoSistema[]>([]);
  const [salvando, setSalvando] = useState(false);

  const atual = fila[0] ?? null;
  const visivel = Boolean(atual) && !pausado;

  const carregarPendentes = useCallback(async () => {
    if (!usuarioId || pausado) return;

    try {
      const pendentes = await comunicadoService.listarPendentes(usuarioId, {
        planoTipo,
        assinaturaTipo,
      });
      setFila(pendentes);
    } catch (err) {
      console.error('Erro ao carregar comunicados do sistema:', err);
    }
  }, [usuarioId, pausado, planoTipo, assinaturaTipo]);

  useEffect(() => {
    if (usuarioId && !pausado) {
      carregarPendentes();
    } else if (pausado) {
      setFila([]);
    }
  }, [usuarioId, pausado, carregarPendentes]);

  const handleEntendi = async () => {
    if (!usuarioId || !atual) return;

    setSalvando(true);
    try {
      await comunicadoService.registrarDismiss(usuarioId, atual.id);
      setFila((prev) => prev.slice(1));
    } catch (err) {
      console.error('Erro ao registrar leitura do comunicado:', err);
    } finally {
      setSalvando(false);
    }
  };

  if (!atual) return null;

  const tipo = (atual.tipo || 'info').toLowerCase();
  const icone = ICONES_TIPO[tipo] ?? ICONES_TIPO.info;
  const severidade = SEVERIDADE_TIPO[tipo] ?? 'info';
  const cor = COR_TIPO[tipo] ?? COR_TIPO.info;
  const bloqueante = tipo === 'critico' || tipo === 'manutencao';

  return (
    <Dialog
      visible={visivel}
      onHide={bloqueante ? () => {} : handleEntendi}
      header={null}
      closable={!bloqueante}
      dismissableMask={!bloqueante}
      draggable={false}
      resizable={false}
      modal
      style={{ width: 'min(480px, 94vw)' }}
    >
      <div className="flex flex-column align-items-center text-center gap-3 py-2">
        <div
          className="flex align-items-center justify-content-center border-circle"
          style={{ width: '64px', height: '64px', background: `${cor}20` }}
        >
          <i className={`pi ${icone} text-3xl`} style={{ color: cor }} aria-hidden />
        </div>

        <Tag value={tipo} severity={severidade} />

        <h2 className="m-0 text-xl font-bold">{atual.titulo}</h2>

        <p className="m-0 text-color-secondary text-sm line-height-3">{atual.mensagem}</p>

        {fila.length > 1 && (
          <p className="m-0 text-xs text-color-secondary">
            +{fila.length - 1} aviso{fila.length - 1 !== 1 ? 's' : ''} na fila
          </p>
        )}

        <LinkAjudaSuporte tema="comunicados_sistema" />

        <Button
          type="button"
          label="Entendi"
          icon="pi pi-check"
          severity="success"
          className="w-full"
          loading={salvando}
          onClick={handleEntendi}
        />
      </div>
    </Dialog>
  );
}
