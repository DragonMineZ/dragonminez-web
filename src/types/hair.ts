export interface Artist {
    username: string;
    avatar_url: string;
}

export interface Category {
    id_category: number;
    description: string;
}

export interface Hair {
    id_hair: number;
    name: string;
    code: string;
    image_url: string;
    description: string | null;
    created_at?: string | Date;
    artist: Artist;
    categories?: Category[];
    is_liked_by_user?: boolean;
    /** Whether the authenticated user owns this hair. Computed server-side. */
    isOwner?: boolean;
    _count?: {
        likes: number;
    };
}

export interface HairMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
