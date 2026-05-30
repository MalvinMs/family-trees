import { useState, useEffect } from "react";
import { Edit2, Trash2, Plus, Sparkles, HelpCircle } from "lucide-react";
import type { Tree, CustomField } from "../../../../store/treeStore";

interface CustomFieldModalProps {
  show: boolean;
  onClose: () => void;
  token: string | null;
  treeId: string;
  activeTree: Tree | null;
  addCustomField: (
    token: string,
    treeId: string,
    fieldName: string,
    fieldType: "text" | "date" | "dropdown" | "tag",
    validationRules?: any
  ) => Promise<any>;
  updateCustomField: (
    token: string,
    fieldId: string,
    fieldName: string,
    validationRules?: any
  ) => Promise<any>;
  deleteCustomField: (
    token: string,
    fieldId: string
  ) => Promise<any>;
  isDarkMode: boolean;
}

export default function CustomFieldModal({
  show,
  onClose,
  token,
  treeId,
  activeTree,
  addCustomField,
  updateCustomField,
  deleteCustomField,
  isDarkMode,
}: CustomFieldModalProps) {
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<"text" | "date" | "dropdown" | "tag">("text");
  const [fieldOptionsInput, setFieldOptionsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);

  // Active custom fields listed in the current tree silsilah
  const customFields = activeTree?.customFields || (activeTree as any)?.custom_fields || [];

  // Reset inputs when opening, closing, or switching edit fields
  useEffect(() => {
    if (!show) {
      setFieldName("");
      setFieldType("text");
      setFieldOptionsInput("");
      setEditingField(null);
    }
  }, [show]);

  // Load field details into form for editing
  const handleEditClick = (field: CustomField) => {
    setEditingField(field);
    // Display names are formatted with underscores; convert back for user readability
    setFieldName(field.field_name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
    setFieldType(field.field_type as any);
    
    const options = field.validation_rules?.options || [];
    setFieldOptionsInput(options.join(", "));
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setFieldName("");
    setFieldType("text");
    setFieldOptionsInput("");
  };

  const handleDeleteClick = async (field: CustomField) => {
    if (!token) return;
    const confirmMessage = `Are you sure you want to delete the "${field.field_name.replace(/_/g, " ")}" field? This will permanently erase this metadata column from all family members.`;
    
    if (confirm(confirmMessage)) {
      setSubmitting(true);
      try {
        await deleteCustomField(token, field.id);
        if (editingField?.id === field.id) {
          handleCancelEdit();
        }
      } catch (err) {
        console.error("Failed to delete custom field:", err);
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !treeId || !fieldName.trim() || submitting) return;
    setSubmitting(true);

    try {
      let validationRules = null;
      if (
        (fieldType === "dropdown" || fieldType === "tag") &&
        fieldOptionsInput.trim()
      ) {
        const options = fieldOptionsInput
          .split(",")
          .map((opt) => opt.trim())
          .filter(Boolean);
        validationRules = { options };
      }

      // Convert name to standard snake_case column format
      const formattedName = fieldName.trim().toLowerCase().replace(/\s+/g, "_");

      if (editingField) {
        // Edit Mode
        await updateCustomField(
          token,
          editingField.id,
          formattedName,
          validationRules || undefined
        );
      } else {
        // Create Mode
        await addCustomField(
          token,
          treeId,
          formattedName,
          fieldType,
          validationRules || undefined
        );
      }

      // Reset
      handleCancelEdit();
    } catch (err) {
      console.error("Failed to persist custom field schema changes:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className={`w-full max-w-4xl p-6 rounded-2xl border shadow-2xl transition-all flex flex-col md:flex-row gap-6 relative ${
          isDarkMode
            ? "bg-[#1a1a1c] border-[#2c2c2e] text-[#f3f3f5]"
            : "bg-white border-[#e6e5e0] text-[#1c1c1e]"
        }`}
      >
        {/* Left Pane: Custom Fields Directory List */}
        <div className="flex-1 flex flex-col pr-0 md:pr-6 md:border-r border-slate-200/50 dark:border-white/5 max-h-[80vh] overflow-y-auto">
          <div className="text-left mb-4">
            <span className="text-[9px] uppercase font-bold tracking-widest text-[#7b8e7f] dark:text-[#9cb2a2] flex items-center gap-1.5">
              <Sparkles size={10} /> Active Schema
            </span>
            <h3 className="text-xl font-serif font-semibold mt-1">
              Custom Metadata Columns
            </h3>
            <p className="text-xs text-slate-400 font-light mt-1">
              Review and manage all dynamic fields currently configured in this lineage tree.
            </p>
          </div>

          <div className="flex-1 space-y-3 pr-1">
            {customFields.length > 0 ? (
              customFields.map((field: any) => {
                const label = field.field_name.replace(/_/g, " ");
                const options = field.validation_rules?.options || [];

                return (
                  <div
                    key={field.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isDarkMode
                        ? "bg-[#121213] border-[#2c2c2e] hover:border-slate-700"
                        : "bg-[#faf9f6] border-[#e6e5e0] hover:border-slate-350"
                    } ${editingField?.id === field.id ? "ring-1 ring-[#7b8e7f] dark:ring-[#9cb2a2]" : ""}`}
                  >
                    <div className="text-left space-y-1.5 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs capitalize truncate">
                          {label}
                        </h4>
                        <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                          isDarkMode
                            ? "bg-white/5 text-slate-400"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {field.field_type}
                        </span>
                      </div>
                      
                      {options.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {options.slice(0, 5).map((opt: string) => (
                            <span
                              key={opt}
                              className="text-[9px] px-1.5 py-0.25 rounded-md font-semibold bg-[#7b8e7f]/10 text-[#7b8e7f] dark:bg-[#9cb2a2]/15 dark:text-[#9cb2a2]"
                            >
                              {opt}
                            </span>
                          ))}
                          {options.length > 5 && (
                            <span className="text-[9px] text-slate-400 pl-1 font-light">
                              +{options.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditClick(field)}
                        disabled={submitting}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isDarkMode
                            ? "border-white/5 text-slate-400 hover:text-white hover:bg-white/5"
                            : "border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                        title="Edit Field Schema"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(field)}
                        disabled={submitting}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isDarkMode
                            ? "border-white/5 text-rose-455 hover:bg-rose-500/10"
                            : "border-slate-200 text-rose-600 hover:bg-rose-50"
                        }`}
                        title="Delete Field"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-white/5 text-center text-slate-400 font-light text-xs">
                No custom schema metadata columns configured yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Add / Update Column Schema Form */}
        <div className="w-full md:w-[350px] flex flex-col justify-between text-left">
          <div>
            <div className="mb-4">
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#7b8e7f] dark:text-[#9cb2a2] flex items-center gap-1.5">
                <Plus size={10} /> {editingField ? "Edit Mode" : "Creation Mode"}
              </span>
              <h3 className="text-lg font-serif font-semibold mt-1">
                {editingField ? "Update Column" : "Configure Column"}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Display Column Name
                </label>
                <input
                  type="text"
                  required
                  disabled={submitting}
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="e.g. Clan Name / Marga"
                  className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                    isDarkMode
                      ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                      : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                  } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Input type format
                </label>
                <select
                  value={fieldType}
                  disabled={submitting || editingField !== null} // Type cannot be modified after schema creation
                  onChange={(e: any) => setFieldType(e.target.value)}
                  style={{
                    backgroundImage: isDarkMode
                      ? `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239cb2a2' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`
                      : `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%237b8e7f' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: "right 0.75rem center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "1.25rem 1.25rem",
                  }}
                  className={`w-full appearance-none pr-10 px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm cursor-pointer ${
                    isDarkMode
                      ? "bg-[#121213] border-[#2c2c2e] text-[#f3f3f5] focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                      : "bg-[#faf9f6] border-[#e6e5e0] text-[#1c1c1e] focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                  } ${(submitting || editingField !== null) ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <option value="text">Single Line Text</option>
                  <option value="date">Date picker</option>
                  <option value="dropdown">Dropdown select list</option>
                  <option value="tag">Tags collection</option>
                </select>
                {editingField && (
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-light italic">
                    <HelpCircle size={10} /> Column type format cannot be modified after creation.
                  </p>
                )}
              </div>

              {(fieldType === "dropdown" || fieldType === "tag") && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Predefined options (comma-separated)
                  </label>
                  <input
                    type="text"
                    required
                    disabled={submitting}
                    value={fieldOptionsInput}
                    onChange={(e) => setFieldOptionsInput(e.target.value)}
                    placeholder="e.g. Lubis, Siregar, Nasution"
                    className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                      isDarkMode
                        ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                        : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                    } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                </div>
              )}

              <div className="flex gap-2.5 pt-4 border-t border-slate-200/50 dark:border-white/5">
                {editingField ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={submitting}
                      className={`flex-1 py-2 rounded-lg font-semibold text-xs border transition-colors ${
                        isDarkMode
                          ? "border-white/5 text-slate-400 hover:text-white hover:bg-white/5"
                          : "border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      } ${submitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      Cancel Edit
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`flex-1 py-2 rounded-lg font-semibold text-xs transition-colors shadow-sm ${
                        isDarkMode
                          ? "bg-[#f3f3f5] text-[#1c1c1e] hover:bg-white"
                          : "bg-[#1c1c1e] text-white hover:bg-slate-800"
                      } ${submitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {submitting ? "Saving..." : "Save Column"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={submitting}
                      className={`flex-1 py-2 rounded-lg font-semibold text-xs border transition-colors ${
                        isDarkMode
                          ? "border-white/5 text-slate-400 hover:text-white hover:bg-white/5"
                          : "border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      } ${submitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      Close Manager
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`flex-1 py-2 rounded-lg font-semibold text-xs transition-colors shadow-sm ${
                        isDarkMode
                          ? "bg-[#f3f3f5] text-[#1c1c1e] hover:bg-white"
                          : "bg-[#1c1c1e] text-white hover:bg-slate-800"
                      } ${submitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {submitting ? "Configuring..." : "Add Column"}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
