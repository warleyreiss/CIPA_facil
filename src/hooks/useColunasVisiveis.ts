import { useCallback, useMemo, useState } from 'react';

export interface ColunaTabelaDef {
    field: string;
    header: string;
    locked?: boolean;
}

export function useColunasVisiveis(colunas: ColunaTabelaDef[], storageKey?: string) {
    const toggleable = useMemo(
        () => colunas.filter((c) => !c.locked),
        [colunas],
    );

    const todosToggleable = useMemo(
        () => toggleable.map((c) => c.field),
        [toggleable],
    );

    const [visiveis, setVisiveis] = useState<string[]>(() => {
        if (storageKey && typeof window !== 'undefined') {
            try {
                const salvo = localStorage.getItem(storageKey);
                if (salvo) {
                    const parsed = JSON.parse(salvo) as string[];
                    const validos = parsed.filter((f) => todosToggleable.includes(f));
                    if (validos.length > 0) return validos;
                }
            } catch {
                /* ignora storage inválido */
            }
        }
        return todosToggleable;
    });

    const persistir = useCallback(
        (fields: string[]) => {
            const validos = fields.filter((f) => todosToggleable.includes(f));
            const next = validos.length > 0 ? validos : todosToggleable;
            setVisiveis(next);
            if (storageKey && typeof window !== 'undefined') {
                localStorage.setItem(storageKey, JSON.stringify(next));
            }
        },
        [storageKey, todosToggleable],
    );

    const isVisible = useCallback(
        (field: string) => {
            if (colunas.find((c) => c.field === field)?.locked) return true;
            return visiveis.includes(field);
        },
        [colunas, visiveis],
    );

    return {
        colunasToggleable: toggleable,
        colunasVisiveis: visiveis,
        setColunasVisiveis: persistir,
        isVisible,
    };
}
