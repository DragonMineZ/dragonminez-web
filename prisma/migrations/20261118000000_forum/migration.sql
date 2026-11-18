-- CreateTable
CREATE TABLE "forum_user" (
    "id" SERIAL NOT NULL,
    "clerkId" TEXT NOT NULL,
    "discordId" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "username" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "bannedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_category" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "postRole" TEXT NOT NULL DEFAULT 'member',
    "kind" TEXT NOT NULL DEFAULT 'discussion',

    CONSTRAINT "forum_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_thread" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "cover" TEXT,
    "image" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "votes" INTEGER NOT NULL DEFAULT 0,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPostAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replyCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "forum_thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_post" (
    "id" SERIAL NOT NULL,
    "threadId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "forum_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_like" (
    "userId" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,

    CONSTRAINT "forum_like_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "forum_notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "actorId" INTEGER,
    "type" TEXT NOT NULL,
    "threadId" INTEGER,
    "postId" INTEGER,
    "serverId" INTEGER,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_report" (
    "id" SERIAL NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "handledById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_server" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "threadId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discordInvite" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_user_role" (
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,

    CONSTRAINT "forum_user_role_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateIndex
CREATE UNIQUE INDEX "forum_user_clerkId_key" ON "forum_user"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "forum_category_slug_key" ON "forum_category"("slug");

-- CreateIndex
CREATE INDEX "forum_thread_categoryId_pinned_lastPostAt_idx" ON "forum_thread"("categoryId", "pinned", "lastPostAt");

-- CreateIndex
CREATE INDEX "forum_thread_authorId_idx" ON "forum_thread"("authorId");

-- CreateIndex
CREATE INDEX "forum_post_threadId_createdAt_idx" ON "forum_post"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "forum_post_authorId_idx" ON "forum_post"("authorId");

-- CreateIndex
CREATE INDEX "forum_like_postId_idx" ON "forum_like"("postId");

-- CreateIndex
CREATE INDEX "forum_notification_userId_readAt_idx" ON "forum_notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "forum_report_status_createdAt_idx" ON "forum_report"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "forum_report_reporterId_postId_key" ON "forum_report"("reporterId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "forum_server_threadId_key" ON "forum_server"("threadId");

-- CreateIndex
CREATE INDEX "forum_server_status_createdAt_idx" ON "forum_server"("status", "createdAt");

-- CreateIndex
CREATE INDEX "forum_server_ownerId_idx" ON "forum_server"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "forum_role_name_key" ON "forum_role"("name");

-- CreateIndex
CREATE INDEX "forum_user_role_roleId_idx" ON "forum_user_role"("roleId");

-- AddForeignKey
ALTER TABLE "forum_thread" ADD CONSTRAINT "forum_thread_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "forum_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_thread" ADD CONSTRAINT "forum_thread_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "forum_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_post" ADD CONSTRAINT "forum_post_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "forum_thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_post" ADD CONSTRAINT "forum_post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "forum_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_like" ADD CONSTRAINT "forum_like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "forum_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_like" ADD CONSTRAINT "forum_like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "forum_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_notification" ADD CONSTRAINT "forum_notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "forum_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_notification" ADD CONSTRAINT "forum_notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "forum_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_report" ADD CONSTRAINT "forum_report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "forum_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_report" ADD CONSTRAINT "forum_report_postId_fkey" FOREIGN KEY ("postId") REFERENCES "forum_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_report" ADD CONSTRAINT "forum_report_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "forum_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_server" ADD CONSTRAINT "forum_server_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "forum_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_server" ADD CONSTRAINT "forum_server_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "forum_thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_user_role" ADD CONSTRAINT "forum_user_role_userId_fkey" FOREIGN KEY ("userId") REFERENCES "forum_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_user_role" ADD CONSTRAINT "forum_user_role_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "forum_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- The forum's categories, in order: Announcements (admins post), Community Servers, Guides (staff post), Suggestions, Bug-reports.
INSERT INTO "forum_category" ("slug", "position", "postRole", "kind") VALUES
  ('announcements', 0, 'admin', 'discussion'),
  ('servers', 1, 'member', 'servers'),
  ('guides', 2, 'staff', 'discussion'),
  ('suggestions', 3, 'member', 'suggestions'),
  ('bug-reports', 4, 'member', 'bugs');
