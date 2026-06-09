import { useState } from "react";
import { useAuth } from "@clerk/astro/react";
import { useLanguage } from "../../../i18n";
import Button from "../../ui/Button";
import ConfirmDialog from "../../ui/ConfirmDialog";
import ErrorAlert from "../../ui/ErrorAlert";

interface PostActionsProps {
    postId: number;
    /** Whether the viewer owns the post (server-computed). */
    isOwner: boolean;
}

/** Edit/Delete controls on a blog post page. Authorization is enforced by the API. */
export default function PostActions({ postId, isOwner }: PostActionsProps) {
    const { getToken } = useAuth();
    const { t } = useLanguage();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const token = await getToken();
            const res = await fetch(`/api/blog/posts/${postId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok || res.status === 204) {
                window.location.href = "/blog";
                return;
            }
            setError(t("blog.deleteError"));
        } catch {
            setError(t("common.connectionError"));
        } finally {
            setDeleting(false);
            setConfirmOpen(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {isOwner && (
                <a href={`/blog/edit/${postId}`}>
                    <Button variant="secondary" size="sm">
                        <span className="material-symbols-outlined text-[16px] mr-1.5">edit</span>
                        {t("blog.editPost")}
                    </Button>
                </a>
            )}
            <Button variant="danger" size="sm" disabled={deleting} onClick={() => setConfirmOpen(true)}>
                <span className="material-symbols-outlined text-[16px] mr-1.5">delete</span>
                {t("blog.deletePost")}
            </Button>

            <ConfirmDialog
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleDelete}
                title={t("blog.deleteConfirmTitle")}
                description={t("blog.deleteConfirmDesc")}
            />
            <ErrorAlert show={!!error} message={error} onClose={() => setError("")} />
        </div>
    );
}
