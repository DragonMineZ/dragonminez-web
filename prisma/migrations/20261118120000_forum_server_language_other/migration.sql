-- Forum servers: drop the DragonMineZ version, name the language when it is "other".
ALTER TABLE "forum_server" DROP COLUMN "version",
ADD COLUMN "languageOther" TEXT;
