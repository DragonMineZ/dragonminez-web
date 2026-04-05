interface AuthorTagProps {
    avatarUrl: string;
    username: string;
    isOnline?: boolean;
}

export default function AuthorTag({ avatarUrl, username, isOnline = true }: AuthorTagProps) {
    return (
        <div className="flex items-center gap-2.5">
            <div className="relative">
                <img
                    src={avatarUrl}
                    alt={username}
                    className="w-8 h-8 rounded-full border border-glass object-cover"
                />
                {isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-surface rounded-full" />
                )}
            </div>
            <div className="flex flex-col">
                <span className="text-xs text-muted font-medium">Author</span>
                <span className="text-sm text-foreground font-semibold leading-tight">
                    {username}
                </span>
            </div>
        </div>
    );
}
