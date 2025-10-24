-- CreateTable
CREATE TABLE "ButtonLog" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ButtonLog_pkey" PRIMARY KEY ("id")
);
