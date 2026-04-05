import type { Hair } from "../components/types/hair";

export function filterHairs(
    hairs: Hair[],
    searchQuery: string,
    selectedCategory: number | string,
    showMyCreations: boolean,
    isSignedIn: boolean,
    userId: string | null | undefined
): Hair[] {
    return hairs.filter((hair) => {
        const matchesSearch =
            hair.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            hair.description?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory = selectedCategory === "all" ||
            hair.categories?.some(cat => cat.id_category === Number(selectedCategory));

        const matchesMyCreations = !showMyCreations || (isSignedIn && hair.artist?.clerk_id === userId);

        return matchesSearch && matchesCategory && matchesMyCreations;
    });
}

export function sortHairs(hairs: Hair[], sortBy: string): Hair[] {
    return [...hairs].sort((a, b) => {
        if (sortBy === "likes") {
            const diff = (b._count?.likes || 0) - (a._count?.likes || 0);
            if (diff !== 0) return diff;
            return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
        if (sortBy === "oldest") {
            return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        }
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
}
