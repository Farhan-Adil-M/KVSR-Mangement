"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteResource, uploadResource } from "@/lib/actions/resources";
import { Modal } from "@/components/modal";
import { EmptyState } from "@/components/empty-state";
import {
  Field,
  StatusMessage,
  btnDangerCls,
  btnPrimaryCls,
  btnSecondaryCls,
  iconBtnCls,
  inputCls,
  textareaCls,
} from "@/components/form-controls";
import {
  BookOpen,
  ClipboardList,
  Download,
  FileText,
  Folder,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

export interface ResourceRow {
  id: string;
  title: string;
  description: string | null;
  type: string;
  subjectName: string | null;
  fileName: string | null;
  hasFile: boolean;
  uploadedByRole: string;
  uploadedByName: string | null;
  createdAt: string;
}

interface ResourceManagerProps {
  sectionId: string;
  resources: ResourceRow[];
  subjects: { id: string; name: string }[];
  isCR: boolean;
}

const MAX_FILE_BYTES = 4 * 1024 * 1024;

const GROUPS = [
  { type: "assignment", label: "Assignments", icon: ClipboardList },
  { type: "exam", label: "Exams", icon: FileText },
  { type: "syllabus", label: "Syllabus", icon: BookOpen },
  { type: "other", label: "Other", icon: Folder },
] as const;

const TYPE_OPTIONS = [
  { value: "assignment", label: "Assignment" },
  { value: "exam", label: "Exam material" },
  { value: "syllabus", label: "Syllabus" },
  { value: "other", label: "Other" },
] as const;

const ROLE_LABELS: Record<string, string> = {
  student: "CR",
  faculty: "Faculty",
  admin: "Admin",
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function ResourceManager({ sectionId, resources, subjects, isCR }: ResourceManagerProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("assignment");
  const [subjectId, setSubjectId] = useState("");
  const [description, setDescription] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ResourceRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, ResourceRow[]>();
    for (const row of resources) {
      const list = map.get(row.type) ?? [];
      list.push(row);
      map.set(row.type, list);
    }
    return map;
  }, [resources]);

  function handleFile(file: File | null) {
    setFileError(null);
    setFileBase64(null);
    setFileName("");
    setFileSize(0);
    if (!file) return;
    if (file.type !== "application/pdf") {
      setFileError("Only PDF files are allowed.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("PDF must be 4 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.slice(result.indexOf(",") + 1) : result;
      setFileBase64(base64);
      setFileName(file.name);
      setFileSize(file.size);
    };
    reader.onerror = () => setFileError("Could not read the file. Try again.");
    reader.readAsDataURL(file);
  }

  async function submitUpload(e: React.FormEvent) {
    e.preventDefault();
    setFormMessage(null);
    setUploading(true);
    try {
      const trimmed = description.trim();
      const res = await uploadResource({
        sectionId,
        subjectId: subjectId || undefined,
        title: title.trim(),
        description: trimmed || undefined,
        type: type as "assignment" | "exam" | "syllabus" | "other",
        file: fileBase64
          ? { name: fileName, mime: "application/pdf", dataBase64: fileBase64 }
          : undefined,
      });
      if (res.success) {
        setTitle("");
        setType("assignment");
        setSubjectId("");
        setDescription("");
        setFileBase64(null);
        setFileName("");
        setFileSize(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setFormMessage("Resource uploaded.");
        router.refresh();
      } else {
        setFormMessage(res.error);
      }
    } finally {
      setUploading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const res = await deleteResource(deleteTarget.id);
      if (res.success) {
        setDeleteTarget(null);
        router.refresh();
      } else {
        setDeleteError(res.error);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {isCR && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-kvsr-soft shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-kvsr-navy/5 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-kvsr-navy" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-semibold text-kvsr-ink">Share a resource with your class</h2>
              <p className="text-sm text-muted-foreground">
                As class representative you can upload notes and files for
                everyone in your section.
              </p>
            </div>
          </div>
          <form onSubmit={submitUpload} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Title" htmlFor="resource-title">
                <input
                  id="resource-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                  placeholder="Unit 3 notes"
                  className={inputCls}
                />
              </Field>
              <Field label="Type" htmlFor="resource-type">
                <select
                  id="resource-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={inputCls}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field
              label="Subject (optional)"
              htmlFor="resource-subject"
              hint="Leave blank for resources that apply to the whole class."
            >
              <select
                id="resource-subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className={inputCls}
              >
                <option value="">All subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Description (optional)" htmlFor="resource-description">
              <textarea
                id="resource-description"
                rows={2}
                maxLength={2000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={textareaCls}
              />
            </Field>

            <Field
              label="PDF file (optional, max 4 MB)"
              htmlFor="resource-file"
              hint="The file is shared with your class as a downloadable PDF."
            >
              <input
                ref={fileInputRef}
                id="resource-file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-kvsr-ink file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-kvsr-navy/[0.06] file:text-kvsr-navy file:text-sm file:font-semibold hover:file:bg-kvsr-navy/10"
              />
            </Field>
            {fileError && <StatusMessage kind="error" text={fileError} />}
            {fileName && !fileError && (
              <p className="text-xs text-muted-foreground">
                {fileName} · {formatBytes(fileSize)} ready to upload
              </p>
            )}

            {formMessage && (
              <StatusMessage
                kind={formMessage === "Resource uploaded." ? "success" : "error"}
                text={formMessage}
              />
            )}

            <button type="submit" disabled={uploading} className={btnPrimaryCls}>
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="w-4 h-4" aria-hidden="true" />
              )}
              {uploading ? "Uploading…" : "Upload resource"}
            </button>
          </form>
        </div>
      )}

      {resources.length === 0 ? (
        <EmptyState
          icon={Folder}
          title="No resources yet"
          description={
            isCR
              ? "Upload the first file above and it will appear here for your class."
              : "Notes, exam material, and syllabus shared by faculty or your class representative will appear here."
          }
        />
      ) : (
        GROUPS.map((group) => {
          const rows = grouped.get(group.type) ?? [];
          if (rows.length === 0) return null;
          const Icon = group.icon;
          return (
            <section key={group.type} className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-kvsr-muted uppercase tracking-wider">
                <Icon className="w-4 h-4" aria-hidden="true" />
                {group.label}
              </h2>
              <ul className="bg-white rounded-2xl border border-kvsr-soft shadow-sm divide-y divide-kvsr-soft overflow-hidden">
                {rows.map((row) => (
                  <li key={row.id} className="p-4 sm:p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-kvsr-ink">{row.title}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                          {row.subjectName && (
                            <span className="font-medium text-kvsr-cta">{row.subjectName}</span>
                          )}
                          <span>
                            Shared by{" "}
                            {row.uploadedByName ??
                              ROLE_LABELS[row.uploadedByRole] ??
                              row.uploadedByRole}
                          </span>
                          <span>
                            {new Date(row.createdAt).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                      {isCR && row.uploadedByRole === "student" && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTarget(row);
                            setDeleteError(null);
                          }}
                          aria-label={`Delete ${row.title}`}
                          className={`${iconBtnCls} shrink-0 hover:text-destructive hover:border-destructive/40`}
                        >
                          <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    {row.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {row.description}
                      </p>
                    )}
                    {row.hasFile ? (
                      <a
                        href={`/api/resources/${row.id}`}
                        className="inline-flex items-center gap-2 px-4 min-h-[44px] w-fit rounded-xl border border-kvsr-soft bg-white text-sm font-semibold text-kvsr-navy hover:border-kvsr-navy/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold"
                      >
                        <Download className="w-4 h-4" aria-hidden="true" />
                        Download{row.fileName ? ` · ${row.fileName}` : ""}
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground">Details only, no file attached.</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete resource"
        description="This removes it for your whole class."
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-kvsr-ink">
              Delete <span className="font-semibold">{deleteTarget.title}</span>?
              Classmates will no longer see or download it.
            </p>
            {deleteError && <StatusMessage kind="error" text={deleteError} />}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className={btnSecondaryCls}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className={btnDangerCls}
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                Delete resource
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
