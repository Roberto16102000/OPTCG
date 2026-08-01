export interface OnePieceCard {
  id: string;
  code: string;
  rarity: string;
  type: string;
  name: string;
  images: {
    small: string;
    large: string;
  };
  cost: number | string;
  attribute?: {
    name: string;
    image: string;
  };
  power?: number | string;
  counter?: string;
  color: string;
  family?: string;
  ability?: string;
  trigger?: string;
  set?: {
    name: string;
  };
  /** Comic, Animation, Original Illustrations, Other (sitio oficial) */
  illustrationType?: string;
  notes?: string[];
}

export interface CardsPageResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: OnePieceCard[];
}

export interface CardFilters {
  id?: string;
  code?: string;
  name?: string;
  color?: string;
  rarity?: string;
  type?: string;
}

export interface CollectionEntry {
  card: OnePieceCard;
  quantity: number;
  addedAt: string;
}
