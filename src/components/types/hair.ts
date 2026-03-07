export interface Hair {
    id_hair: number;
    name: string;
    code: string;
    image_url: string;
    description: string | null;
    artist: {
        id_user: number;
        clerk_id: string;
        username: string;
        avatar_url: string;
    };
    categories?: {
        id_category: number;
        description: string | null;
    }[];
    _count?: {
        likes: number;
    };
}
