//src/server/shared/verticalFormConfig.ts
export type VerticalFormRules = {
  showLocation: boolean;
  requireLocation: boolean;
};

export const verticalFormConfig: Record<string, VerticalFormRules> = {
  bienes: { showLocation: true, requireLocation: true },
  skincare: { showLocation: false, requireLocation: false },
  joyeria: { showLocation: false, requireLocation: false },
};

// fallback si llega una vertical nueva
export const defaultVerticalRules: VerticalFormRules = {
  showLocation: true,
  requireLocation: false,
};