import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  uploadCustomModule,
  type UploadModuleResponse,
} from "../registry/module-upload-client";

type ModuleStatus = "active" | "disabled" | "draft";

interface ModuleRegistrationFormState {
  componentId: string;
  displayName: string;
  remoteScope: string;
  exposedModule: `./${string}`;
  remoteEntryPath: string;
  defaultLayoutWidth: string;
  defaultLayoutHeight: string;
  status: ModuleStatus;
  version: string;
  tenantId: string;
  env: string;
}

const initialFormState: ModuleRegistrationFormState = {
  componentId: "",
  displayName: "",
  remoteScope: "",
  exposedModule: "./Widget",
  remoteEntryPath: "remoteEntry.js",
  defaultLayoutWidth: "6",
  defaultLayoutHeight: "4",
  status: "active",
  version: "1.0.0",
  tenantId: "public",
  env: "local",
};

export function RegisterComponentPage() {
  const [formState, setFormState] =
    useState<ModuleRegistrationFormState>(initialFormState);
  const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResponse, setSuccessResponse] = useState<UploadModuleResponse | null>(null);

  const canSubmit = useMemo(
    () => !isSubmitting && archiveFile !== null,
    [archiveFile, isSubmitting],
  );

  const handleFieldChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setFormState((currentState) => ({
      ...currentState,
      [name]: value,
    }));
  };

  const handleArchiveChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setArchiveFile(selectedFile);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!archiveFile) {
      setErrorMessage("Please select a ZIP archive.");
      return;
    }

    const width = Number(formState.defaultLayoutWidth);
    const height = Number(formState.defaultLayoutHeight);

    if (!Number.isFinite(width) || width <= 0) {
      setErrorMessage("Default layout width must be greater than 0.");
      return;
    }

    if (!Number.isFinite(height) || height <= 0) {
      setErrorMessage("Default layout height must be greater than 0.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessResponse(null);

    try {
      const response = await uploadCustomModule({
        componentId: formState.componentId.trim(),
        displayName: formState.displayName.trim(),
        remoteScope: formState.remoteScope.trim(),
        exposedModule: formState.exposedModule.trim() as `./${string}`,
        remoteEntryPath: formState.remoteEntryPath.trim(),
        defaultLayoutWidth: Math.floor(width),
        defaultLayoutHeight: Math.floor(height),
        status: formState.status,
        version: formState.version.trim(),
        tenantId: formState.tenantId.trim(),
        env: formState.env.trim(),
        archiveFile,
      });
      setSuccessResponse(response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="composer-shell composer-shell--single-column">
      <section className="composer-state-preview module-upload-page">
        <header className="module-upload-header">
          <h1>Register Custom Module</h1>
          <p>Submit module metadata and a ZIP archive to register a remote module.</p>
        </header>

        <form className="module-upload-form" onSubmit={handleSubmit}>
          <label className="module-upload-field">
            <span>Component ID</span>
            <input
              name="componentId"
              value={formState.componentId}
              onChange={handleFieldChange}
              placeholder="mfa-register-widget"
              required
            />
          </label>

          <label className="module-upload-field">
            <span>Display Name</span>
            <input
              name="displayName"
              value={formState.displayName}
              onChange={handleFieldChange}
              placeholder="MFA Register Widget"
              required
            />
          </label>

          <label className="module-upload-field">
            <span>Remote Scope</span>
            <input
              name="remoteScope"
              value={formState.remoteScope}
              onChange={handleFieldChange}
              placeholder="remoteWidget"
              required
            />
          </label>

          <label className="module-upload-field">
            <span>Exposed Module</span>
            <input
              name="exposedModule"
              value={formState.exposedModule}
              onChange={handleFieldChange}
              placeholder="./Widget"
              required
            />
          </label>

          <label className="module-upload-field">
            <span>Remote Entry Path In ZIP</span>
            <input
              name="remoteEntryPath"
              value={formState.remoteEntryPath}
              onChange={handleFieldChange}
              placeholder="remoteEntry.js"
              required
            />
          </label>

          <label className="module-upload-field">
            <span>Default Layout Width</span>
            <input
              type="number"
              min={1}
              name="defaultLayoutWidth"
              value={formState.defaultLayoutWidth}
              onChange={handleFieldChange}
              required
            />
          </label>

          <label className="module-upload-field">
            <span>Default Layout Height</span>
            <input
              type="number"
              min={1}
              name="defaultLayoutHeight"
              value={formState.defaultLayoutHeight}
              onChange={handleFieldChange}
              required
            />
          </label>

          <label className="module-upload-field">
            <span>Status</span>
            <select name="status" value={formState.status} onChange={handleFieldChange}>
              <option value="active">active</option>
              <option value="disabled">disabled</option>
              <option value="draft">draft</option>
            </select>
          </label>

          <label className="module-upload-field">
            <span>Version</span>
            <input
              name="version"
              value={formState.version}
              onChange={handleFieldChange}
              placeholder="1.0.0"
              required
            />
          </label>

          <label className="module-upload-field">
            <span>Tenant ID</span>
            <input
              name="tenantId"
              value={formState.tenantId}
              onChange={handleFieldChange}
              placeholder="public"
              required
            />
          </label>

          <label className="module-upload-field">
            <span>Environment</span>
            <input
              name="env"
              value={formState.env}
              onChange={handleFieldChange}
              placeholder="local"
              required
            />
          </label>

          <label className="module-upload-field module-upload-field--full-width">
            <span>Module ZIP Archive</span>
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={handleArchiveChange}
              required
            />
            <small>{archiveFile ? archiveFile.name : "No file selected"}</small>
          </label>

          <div className="module-upload-actions module-upload-field--full-width">
            <button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Uploading..." : "Register Module"}
            </button>
            <Link to="/">Back to Home</Link>
          </div>
        </form>

        {errorMessage ? <p className="module-upload-error">{errorMessage}</p> : null}

        {successResponse ? (
          <section className="composer-state-preview">
            <h3>Upload Result</h3>
            <pre>{JSON.stringify(successResponse, null, 2)}</pre>
          </section>
        ) : null}
      </section>
    </main>
  );
}
