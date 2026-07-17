-- CreateTable
CREATE TABLE "Vote" (
    "id_vote" SERIAL NOT NULL,
    "id_user" INTEGER NOT NULL,
    "race" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id_vote")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vote_id_user_key" ON "Vote"("id_user");

-- CreateIndex
CREATE INDEX "Vote_race_idx" ON "Vote"("race");

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "User"("id_user") ON DELETE CASCADE ON UPDATE CASCADE;
