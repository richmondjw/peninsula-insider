export type EditableMode = 'public' | 'admin';

export interface EditableBaseProps {
  id: string;
  mode?: EditableMode;
  label?: string;
  as?: string;
  class?: string;
}

export function getEditableAttrs({
  id,
  mode = 'public',
  label,
}: Pick<EditableBaseProps, 'id' | 'mode' | 'label'>) {
  return {
    'data-editable-id': id,
    'data-editable-label': label ?? id,
    'data-editable-mode': mode,
  };
}
