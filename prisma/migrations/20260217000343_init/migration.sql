-- CreateTable
CREATE TABLE "User" (
    "id_user" SERIAL NOT NULL,
    "clerk_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "avatar_url" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id_user")
);

-- CreateTable
CREATE TABLE "Hair" (
    "id_hair" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "artistId" INTEGER NOT NULL,

    CONSTRAINT "Hair_pkey" PRIMARY KEY ("id_hair")
);

-- CreateTable
CREATE TABLE "Category" (
    "id_category" SERIAL NOT NULL,
    "description" TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id_category")
);

-- CreateTable
CREATE TABLE "Like" (
    "id_user" INTEGER NOT NULL,
    "id_hair" INTEGER NOT NULL,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id_user","id_hair")
);

-- CreateTable
CREATE TABLE "_CategoryToHair" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CategoryToHair_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerk_id_key" ON "User"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Hair_code_key" ON "Hair"("code");

-- CreateIndex
CREATE INDEX "_CategoryToHair_B_index" ON "_CategoryToHair"("B");

-- AddForeignKey
ALTER TABLE "Hair" ADD CONSTRAINT "Hair_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "User"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "User"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_id_hair_fkey" FOREIGN KEY ("id_hair") REFERENCES "Hair"("id_hair") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToHair" ADD CONSTRAINT "_CategoryToHair_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id_category") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToHair" ADD CONSTRAINT "_CategoryToHair_B_fkey" FOREIGN KEY ("B") REFERENCES "Hair"("id_hair") ON DELETE CASCADE ON UPDATE CASCADE;
