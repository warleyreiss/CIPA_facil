

interface Props {
  isOpen: boolean;
}

export const MenuToggleIcon: React.FC<Props> = ({ isOpen }) => {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {isOpen ? (
        // Envolvemos com <> </> para agrupar os elementos
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
          <line x1="8" y1="3" x2="8" y2="21" stroke="currentColor" strokeWidth="2" />
        </>
      ) : (
        // Envolvemos com <> </> para agrupar os elementos
        <>
          <rect x="3" y="4" width="18" height="3" fill="currentColor" />
          <rect x="3" y="10" width="18" height="3" fill="currentColor" />
          <rect x="3" y="16" width="18" height="3" fill="currentColor" />
        </>
      )}
    </svg>
  );
};