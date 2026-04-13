export interface Hair {
    id_hair: number;
    name: string;
    code: string;
    image_url: string;
    description: string | null;
    created_at?: string | Date;
    artist: {
        id_user: number;
        clerk_id: string;
        username: string;
        avatar_url: string;
    };
    categories?: Category[];
    is_liked_by_user?: boolean;
    _count?: {
        likes: number;
    };
}

export interface Category {
    id_category: number;
    description: string;
}
