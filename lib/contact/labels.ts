export const CONTACT_TYPE_LABELS = {
  phone: "電話",
  email: "メール",
  visit: "訪問",
  other: "その他",
} as const;

export type ContactTypeKey = keyof typeof CONTACT_TYPE_LABELS;
