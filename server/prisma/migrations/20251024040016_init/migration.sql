-- CreateTable
CREATE TABLE "program_logs" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT,
    "language" TEXT,
    "code" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_logs_pkey" PRIMARY KEY ("id")
);
