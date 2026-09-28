import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Menu } from 'primereact/menu';
import { useProjeto } from '../contexts/ProjetoContext';
import OverlayRecursoPlano from './OverlayRecursoPlano';
import { useRecursoPlano } from '../hooks/useRecursoPlano';
import { BP_MOBILE, useMediaQuery } from '../hooks/useMediaQuery';
import type { RecursoId } from '../lib/recursosPlano';
import RelogioAcoes from './RelogioAcoes';
import '../assets/css/especificos/cabecalho-app.css';

interface CabecalhoProps {
    /** @deprecated Menu mobile fica na barra inferior */
    setIsMobileOpen?: (open: boolean) => void;
}

function FotoPerfilUsuario({
    fotoUrl,
    nome,
    inicial,
}: {
    fotoUrl?: string | null;
    nome: string;
    inicial: string;
}) {
    const [imgFalhou, setImgFalhou] = useState(false);
    const fotoKey = fotoUrl ?? '';
    // Reseta falha se a URL da foto mudar
    const [ultimaUrl, setUltimaUrl] = useState(fotoKey);
    if (fotoKey !== ultimaUrl) {
        setUltimaUrl(fotoKey);
        setImgFalhou(false);
    }
    const mostrarFoto = Boolean(fotoUrl) && !imgFalhou;

    return (
        <div className="profile_photo_slot">
            {mostrarFoto ? (
                <img
                    src={fotoUrl!}
                    alt={nome}
                    className="profile_photo_img"
                    onError={() => setImgFalhou(true)}
                />
            ) : (
                <div className="profile_photo_fallback" aria-hidden>
                    {inicial}
                </div>
            )}
        </div>
    );
}

export default function Cabecalho(_props: CabecalhoProps) {
    const {
        userData,
        projetoId,
        projetoNome,
        projetoLogo,
        funcaoUsuario,
        setIsModalSelecaoOpen,
    } = useProjeto();
    const { tem, planoTipoRaw } = useRecursoPlano();
    const isMobile = useMediaQuery(BP_MOBILE);

    const navigate = useNavigate();
    const menuUsuarioRef = useRef<Menu>(null);
    const overlayRecursoRef = useRef<any>(null);
    const [recursoOverlay, setRecursoOverlay] = useState<RecursoId | null>(null);

    const podeAlternarProjeto = tem('shell_alternar_projetos');

    const abrirSeletorOuOverlay = (e: React.MouseEvent, recurso: RecursoId = 'shell_alternar_projetos') => {
        if (!projetoId) return;
        if (!podeAlternarProjeto) {
            setRecursoOverlay(recurso);
            overlayRecursoRef.current?.toggle(e);
            return;
        }
        setIsModalSelecaoOpen(true);
    };

    const itensMenuUsuario = [
        {
            label: 'Painel da Conta',
            icon: 'pi pi-user',
            command: () => navigate('/perfil')
        },
        {
            label: 'Suporte',
            icon: 'pi pi-question-circle',
            command: () => navigate('/suporte')
        },
        { separator: true },
        {
            label: 'Desconectar',
            icon: 'pi pi-power-off',
            className: 'p-menuitem-disconnect',
            command: () => supabase.auth.signOut()
        }
    ];

    const userName = userData?.nome_completo || userData?.email?.split('@')[0] || 'User';
    const userInitial = userName.charAt(0).toUpperCase();

    return (
        <div className="header_island_container">
            <OverlayRecursoPlano ref={overlayRecursoRef} recurso={recursoOverlay} planoTipo={planoTipoRaw} />
            <header className={`main_header_reinvented${isMobile ? ' main_header_reinvented--mobile' : ''}`}>
                <div className="header_left_capsule">
                    <div
                        className="project_scope_pill_hoverable"
                        onClick={(e) => abrirSeletorOuOverlay(e)}
                        style={{ cursor: projetoId ? 'pointer' : 'default' }}
                    >
                        <div className="pill_neon_indicator"></div>

                        <div className="pill_identity_block">
                            {projetoLogo ? (
                                <img src={projetoLogo} alt="Logo" className="pill_project_img" />
                            ) : (
                                <div className="pill_project_icon_avatar">
                                    <i className="pi pi-compass"></i>
                                </div>
                            )}

                            <div className="pill_text_wrapper">
                                {!isMobile && <span className="pill_subtitle">Projeto Ativo</span>}
                                <span className="pill_title">
                                    {projetoNome || 'Nenhum Projeto'}
                                </span>
                            </div>
                        </div>

                        {!isMobile && (
                        <div className="pill_hidden_actions">
                            <button
                                className="action_micro_btn"
                                title={podeAlternarProjeto ? 'Alternar Projeto' : 'Recurso do plano'}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    abrirSeletorOuOverlay(e);
                                }}
                            >
                                <i className={podeAlternarProjeto ? 'pi pi-arrow-right-arrow-left' : 'pi pi-lock'}></i>
                            </button>

                            {projetoId && (
                                <button
                                    className="action_micro_btn setup_btn"
                                    title="Ajustes do Projeto"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/configurar-projeto');
                                    }}
                                >
                                    <i className="pi pi-cog"></i>
                                </button>
                            )}
                        </div>
                        )}
                    </div>
                </div>

                <RelogioAcoes />

                <div className="header_right_capsule">
                    {isMobile && projetoId && (
                        <div className="header_project_actions" aria-label="Ações do projeto">
                            <button
                                type="button"
                                className="action_micro_btn"
                                title={podeAlternarProjeto ? 'Alternar Projeto' : 'Recurso do plano'}
                                onClick={(e) => abrirSeletorOuOverlay(e)}
                            >
                                <i className={podeAlternarProjeto ? 'pi pi-arrow-right-arrow-left' : 'pi pi-lock'}></i>
                            </button>
                            <button
                                type="button"
                                className="action_micro_btn setup_btn"
                                title="Ajustes do Projeto"
                                onClick={() => navigate('/configurar-projeto')}
                            >
                                <i className="pi pi-cog"></i>
                            </button>
                        </div>
                    )}
                    <button
                        type="button"
                        className="profile_avatar_btn"
                        onClick={(e) => menuUsuarioRef.current?.toggle(e)}
                        aria-label={`Menu de ${userName}`}
                        title={userName}
                    >
                        <FotoPerfilUsuario
                            fotoUrl={userData?.foto_url}
                            nome={userName}
                            inicial={userInitial}
                        />
                    </button>

                    <div
                        className="profile_biometric_card profile_biometric_card--full"
                        onClick={(e) => menuUsuarioRef.current?.toggle(e)}
                    >
                        <div className="profile_info_strings">
                            <span className="profile_welcome">{funcaoUsuario}</span>
                            <span className="profile_name_string">{userName}</span>
                        </div>

                        <FotoPerfilUsuario
                            fotoUrl={userData?.foto_url}
                            nome={userName}
                            inicial={userInitial}
                        />
                    </div>

                    <Menu
                        model={itensMenuUsuario}
                        popup
                        ref={menuUsuarioRef}
                        id="popup_reinvented"
                        popupAlignment="right"
                    />
                </div>

            </header>
        </div>
    );
}
