export type MenuItem = {
  label?: string;
  icon?: string;
  command?: () => void;
  disabled?: boolean;
  items?: MenuItem[];
  separator?: boolean;
};
