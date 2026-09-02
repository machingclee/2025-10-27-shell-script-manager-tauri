-- CreateTable
CREATE TABLE "application_state" (
    "id" SERIAL NOT NULL,
    "last_opened_folder_id" INTEGER,
    "dark_mode" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DOUBLE PRECISION NOT NULL DEFAULT ROUND(extract(epoch from NOW()::TIMESTAMPTZ) * 1000, 0)::float,
    "created_at_hk" TEXT NOT NULL DEFAULT TO_CHAR((NOW()::TIMESTAMPTZ AT TIME ZONE 'UTC' AT TIME ZONE 'GMT+8'), 'YYYY-MM-DD HH24:MI:SS'),

    CONSTRAINT "application_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scripts_folder" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "ordering" INTEGER NOT NULL,
    "created_at" DOUBLE PRECISION NOT NULL DEFAULT ROUND(extract(epoch from NOW()::TIMESTAMPTZ) * 1000, 0)::float,
    "created_at_hk" TEXT NOT NULL DEFAULT TO_CHAR((NOW()::TIMESTAMPTZ AT TIME ZONE 'UTC' AT TIME ZONE 'GMT+8'), 'YYYY-MM-DD HH24:MI:SS'),

    CONSTRAINT "scripts_folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shell_script" (
    "id" SERIAL NOT NULL,
    "is_markdown" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "ordering" INTEGER NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DOUBLE PRECISION NOT NULL DEFAULT ROUND(extract(epoch from NOW()::TIMESTAMPTZ) * 1000, 0)::float,
    "created_at_hk" TEXT NOT NULL DEFAULT TO_CHAR((NOW()::TIMESTAMPTZ AT TIME ZONE 'UTC' AT TIME ZONE 'GMT+8'), 'YYYY-MM-DD HH24:MI:SS'),
    "show_shell" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "shell_script_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "ordering" INTEGER NOT NULL,
    "created_at" DOUBLE PRECISION NOT NULL DEFAULT ROUND(extract(epoch from NOW()::TIMESTAMPTZ) * 1000, 0)::float,
    "created_at_hk" TEXT NOT NULL DEFAULT TO_CHAR((NOW()::TIMESTAMPTZ AT TIME ZONE 'UTC' AT TIME ZONE 'GMT+8'), 'YYYY-MM-DD HH24:MI:SS'),

    CONSTRAINT "workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historical_shell_script" (
    "id" SERIAL NOT NULL,
    "shell_script_id" INTEGER NOT NULL,
    "execution_time" DOUBLE PRECISION NOT NULL,
    "created_at" DOUBLE PRECISION NOT NULL DEFAULT ROUND(extract(epoch from NOW()::TIMESTAMPTZ) * 1000, 0)::float,
    "created_at_hk" TEXT NOT NULL DEFAULT TO_CHAR((NOW()::TIMESTAMPTZ AT TIME ZONE 'UTC' AT TIME ZONE 'GMT+8'), 'YYYY-MM-DD HH24:MI:SS'),

    CONSTRAINT "historical_shell_script_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event" (
    "id" SERIAL NOT NULL,
    "request_id" TEXT NOT NULL,
    "created_at" DOUBLE PRECISION NOT NULL DEFAULT ROUND(extract(epoch from NOW()::TIMESTAMPTZ) * 1000, 0)::float,
    "created_at_hk" TEXT NOT NULL DEFAULT TO_CHAR((NOW()::TIMESTAMPTZ AT TIME ZONE 'UTC' AT TIME ZONE 'GMT+8'), 'YYYY-MM-DD HH24:MI:SS'),
    "event_type" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "request_user_email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "failure_reason" TEXT NOT NULL DEFAULT '',
    "event_order" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rel_folder_folder" (
    "id" SERIAL NOT NULL,
    "parent_folder_id" INTEGER NOT NULL,
    "child_folder_id" INTEGER NOT NULL,
    "created_at" DOUBLE PRECISION NOT NULL DEFAULT ROUND(extract(epoch from NOW()::TIMESTAMPTZ) * 1000, 0)::float,
    "created_at_hk" TEXT NOT NULL DEFAULT TO_CHAR((NOW()::TIMESTAMPTZ AT TIME ZONE 'UTC' AT TIME ZONE 'GMT+8'), 'YYYY-MM-DD HH24:MI:SS'),

    CONSTRAINT "rel_folder_folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rel_scriptsfolder_shellscript" (
    "id" SERIAL NOT NULL,
    "scripts_folder_id" INTEGER NOT NULL,
    "shell_script_id" INTEGER NOT NULL,
    "created_at" DOUBLE PRECISION NOT NULL DEFAULT ROUND(extract(epoch from NOW()::TIMESTAMPTZ) * 1000, 0)::float,
    "created_at_hk" TEXT NOT NULL DEFAULT TO_CHAR((NOW()::TIMESTAMPTZ AT TIME ZONE 'UTC' AT TIME ZONE 'GMT+8'), 'YYYY-MM-DD HH24:MI:SS'),

    CONSTRAINT "rel_scriptsfolder_shellscript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rel_workspace_folder" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "folder_id" INTEGER NOT NULL,
    "created_at" DOUBLE PRECISION NOT NULL DEFAULT ROUND(extract(epoch from NOW()::TIMESTAMPTZ) * 1000, 0)::float,
    "created_at_hk" TEXT NOT NULL DEFAULT TO_CHAR((NOW()::TIMESTAMPTZ AT TIME ZONE 'UTC' AT TIME ZONE 'GMT+8'), 'YYYY-MM-DD HH24:MI:SS'),

    CONSTRAINT "rel_workspace_folder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scripts_folder_id_idx" ON "scripts_folder"("id");

-- CreateIndex
CREATE INDEX "shell_script_id_idx" ON "shell_script"("id");

-- CreateIndex
CREATE INDEX "workspace_id_idx" ON "workspace"("id");

-- CreateIndex
CREATE INDEX "historical_shell_script_shell_script_id_idx" ON "historical_shell_script"("shell_script_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_id_key" ON "event"("id");

-- CreateIndex
CREATE INDEX "rel_folder_folder_parent_folder_id_idx" ON "rel_folder_folder"("parent_folder_id");

-- CreateIndex
CREATE INDEX "rel_folder_folder_child_folder_id_idx" ON "rel_folder_folder"("child_folder_id");

-- CreateIndex
CREATE UNIQUE INDEX "rel_folder_folder_parent_folder_id_child_folder_id_key" ON "rel_folder_folder"("parent_folder_id", "child_folder_id");

-- CreateIndex
CREATE INDEX "rel_scriptsfolder_shellscript_scripts_folder_id_idx" ON "rel_scriptsfolder_shellscript"("scripts_folder_id");

-- CreateIndex
CREATE INDEX "rel_scriptsfolder_shellscript_shell_script_id_idx" ON "rel_scriptsfolder_shellscript"("shell_script_id");

-- CreateIndex
CREATE UNIQUE INDEX "rel_scriptsfolder_shellscript_shell_script_id_scripts_folde_key" ON "rel_scriptsfolder_shellscript"("shell_script_id", "scripts_folder_id");

-- CreateIndex
CREATE INDEX "rel_workspace_folder_workspace_id_idx" ON "rel_workspace_folder"("workspace_id");

-- CreateIndex
CREATE INDEX "rel_workspace_folder_folder_id_idx" ON "rel_workspace_folder"("folder_id");

-- CreateIndex
CREATE UNIQUE INDEX "rel_workspace_folder_workspace_id_folder_id_key" ON "rel_workspace_folder"("workspace_id", "folder_id");

-- AddForeignKey
ALTER TABLE "rel_folder_folder" ADD CONSTRAINT "rel_folder_folder_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "scripts_folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rel_folder_folder" ADD CONSTRAINT "rel_folder_folder_child_folder_id_fkey" FOREIGN KEY ("child_folder_id") REFERENCES "scripts_folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rel_scriptsfolder_shellscript" ADD CONSTRAINT "rel_scriptsfolder_shellscript_shell_script_id_fkey" FOREIGN KEY ("shell_script_id") REFERENCES "shell_script"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rel_scriptsfolder_shellscript" ADD CONSTRAINT "rel_scriptsfolder_shellscript_scripts_folder_id_fkey" FOREIGN KEY ("scripts_folder_id") REFERENCES "scripts_folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rel_workspace_folder" ADD CONSTRAINT "rel_workspace_folder_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rel_workspace_folder" ADD CONSTRAINT "rel_workspace_folder_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "scripts_folder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

