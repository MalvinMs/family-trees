import { useState, useEffect } from "react";
import type { Tree, Person } from "../../../../store/treeStore";

interface PersonModalProps {
  show: boolean;
  onClose: () => void;
  person: Person | null;
  token: string | null;
  treeId: string;
  addPerson: (token: string, data: any) => Promise<Person | null>;
  updatePerson: (token: string, personId: string, data: any) => Promise<void>;
  activeTree: Tree | null;
  isDarkMode: boolean;
  fitView: (options: any) => void;
}

export default function PersonModal({
  show,
  onClose,
  person,
  token,
  treeId,
  addPerson,
  updatePerson,
  activeTree,
  isDarkMode,
  fitView,
}: PersonModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [biography, setBiography] = useState("");
  const [dynamicData, setDynamicData] = useState<Record<string, any>>({});
  const [submittingPerson, setSubmittingPerson] = useState(false);

  useEffect(() => {
    if (show) {
      if (person) {
        setFirstName(person.first_name);
        setLastName(person.last_name || "");
        setGender(person.gender);
        setBirthDate(person.birth_date ? person.birth_date.split("T")[0] : "");
        setDeathDate(person.death_date ? person.death_date.split("T")[0] : "");
        setBiography(person.biography || "");
        setDynamicData(person.dynamic_data || {});
      } else {
        setFirstName("");
        setLastName("");
        setGender("male");
        setBirthDate("");
        setDeathDate("");
        setBiography("");
        setDynamicData({});
      }
    }
  }, [show, person]);

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !treeId || submittingPerson) return;
    setSubmittingPerson(true);

    try {
      const payload = {
        tree_id: treeId,
        first_name: firstName,
        last_name: lastName || null,
        gender,
        birth_date: birthDate || null,
        death_date: deathDate || null,
        biography: biography || null,
        dynamic_data: dynamicData,
        ui_metadata: person?.ui_metadata ?? {
          x: Math.random() * 300 + 100,
          y: Math.random() * 300 + 100,
        },
      };

      let createdPerson = null;
      if (person) {
        await updatePerson(token, person.id, payload as any);
      } else {
        createdPerson = await addPerson(token, payload as any);
      }

      onClose();

      // Smoothly focus/zoom onto the newly created family member node
      if (createdPerson && createdPerson.id) {
        const newId = createdPerson.id;
        setTimeout(() => {
          fitView({
            nodes: [{ id: newId }],
            duration: 1000,
            maxZoom: 1.2,
            padding: 0.5,
          });
        }, 300);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingPerson(false);
    }
  };

  const customFields =
    activeTree?.customFields || (activeTree as any)?.custom_fields || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl relative transition-all ${
          isDarkMode
            ? "bg-[#1a1a1c] border-[#2c2c2e] text-[#f3f3f5]"
            : "bg-white border-[#e6e5e0] text-[#1c1c1e]"
        }`}
      >
        <h3
          className={`text-2xl font-serif font-semibold mb-4 text-left ${
            isDarkMode ? "text-white" : "text-slate-900"
          }`}
        >
          {person ? "Edit Historical Record" : "Document Family Member"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4 text-left">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                  isDarkMode
                    ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                    : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                }`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                  isDarkMode
                    ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                    : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-left">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e: any) => setGender(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                  isDarkMode
                    ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                    : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                }`}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Birth Date
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                  isDarkMode
                    ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                    : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                }`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Death Date
              </label>
              <input
                type="date"
                value={deathDate}
                onChange={(e) => setDeathDate(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                  isDarkMode
                    ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                    : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                }`}
              />
            </div>
          </div>

          <div className="text-left">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Biography / Historical Context
            </label>
            <textarea
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              rows={2}
              className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                isDarkMode
                  ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                  : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
              }`}
            />
          </div>

          {/* Dynamic Field Form Inputs */}
          {customFields.length > 0 && (
            <div
              className={`border-t pt-4 mt-4 space-y-4 text-left ${
                isDarkMode ? "border-white/5" : "border-slate-100"
              }`}
            >
              <h4
                className={`text-xs font-bold uppercase tracking-widest ${
                  isDarkMode ? "text-[#9cb2a2]" : "text-[#7b8e7f]"
                }`}
              >
                Custom Metadata Columns
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {customFields.map((field: any) => {
                  const fieldLabel = field.field_name.replace("_", " ");

                  if (field.field_type === "dropdown") {
                    const options = field.validation_rules?.options || [];
                    return (
                      <div key={field.id}>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          {fieldLabel}
                        </label>
                        <select
                          value={dynamicData[field.field_name] || ""}
                          onChange={(e) =>
                            setDynamicData({
                              ...dynamicData,
                              [field.field_name]: e.target.value,
                            })
                          }
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
                              : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                          }`}
                        >
                          <option value="">-- Select {fieldLabel} --</option>
                          {options.map((opt: string) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (field.field_type === "tag") {
                    // Parse current tags as array
                    const val = dynamicData[field.field_name];
                    const tagsArr: string[] =
                      typeof val === "string"
                        ? val
                            .split(",")
                            .map((t: string) => t.trim())
                            .filter(Boolean)
                        : Array.isArray(val)
                        ? val
                        : [];

                    const predefinedOptions = field.validation_rules?.options || [];

                    return (
                      <div key={field.id} className="col-span-2 text-left space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {fieldLabel}
                        </label>
                        
                        <div
                          className={`p-3 rounded-xl border flex flex-col gap-2 ${
                            isDarkMode
                              ? "bg-[#121213] border-[#2c2c2e]"
                              : "bg-[#faf9f6] border-[#e6e5e0]"
                          }`}
                        >
                          {/* Tags List */}
                          {tagsArr.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 border-b pb-2 border-dashed border-slate-200 dark:border-white/5">
                              {tagsArr.map((tag: string) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#7b8e7f]/10 text-[#7b8e7f] dark:bg-[#9cb2a2]/20 dark:text-[#9cb2a2]"
                                >
                                  <span>{tag}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const filtered = tagsArr.filter(
                                        (t) => t !== tag
                                      );
                                      setDynamicData({
                                        ...dynamicData,
                                        [field.field_name]: filtered.join(", "),
                                      });
                                    }}
                                    className="text-slate-400 hover:text-red-400 transition-colors cursor-pointer text-[14px] leading-none"
                                  >
                                    &times;
                                  </button>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic">No tags added yet.</div>
                          )}

                          {/* Tag Input and Add Button */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              id={`tag-input-${field.id}`}
                              placeholder="Add custom tag..."
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === ",") {
                                  e.preventDefault();
                                  const inputVal = e.currentTarget.value.trim();
                                  if (inputVal && !tagsArr.includes(inputVal)) {
                                    const updated = [...tagsArr, inputVal];
                                    setDynamicData({
                                      ...dynamicData,
                                      [field.field_name]: updated.join(", "),
                                    });
                                  }
                                  e.currentTarget.value = "";
                                }
                              }}
                              onBlur={(e) => {
                                const inputVal = e.currentTarget.value.trim();
                                if (inputVal && !tagsArr.includes(inputVal)) {
                                  const updated = [...tagsArr, inputVal];
                                  setDynamicData({
                                    ...dynamicData,
                                    [field.field_name]: updated.join(", "),
                                  });
                                  e.currentTarget.value = "";
                                }
                              }}
                              className="flex-1 bg-transparent border-0 focus:outline-none text-xs focus:ring-0 p-0.5 text-[#1c1c1e] dark:text-[#f3f3f5]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById(`tag-input-${field.id}`) as HTMLInputElement;
                                if (input) {
                                  const inputVal = input.value.trim();
                                  if (inputVal && !tagsArr.includes(inputVal)) {
                                    const updated = [...tagsArr, inputVal];
                                    setDynamicData({
                                      ...dynamicData,
                                      [field.field_name]: updated.join(", "),
                                    });
                                  }
                                  input.value = "";
                                }
                              }}
                              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                isDarkMode
                                  ? "bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white"
                                  : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                              }`}
                            >
                              + Add
                            </button>
                          </div>
                        </div>

                        {/* Helper instruction */}
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Type and press Enter, Comma, or click + to add custom tag. Commits automatically on blur.
                        </p>

                        {/* Predefined Suggestions */}
                        {predefinedOptions.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="block text-[9px] uppercase font-bold tracking-widest text-slate-400">
                              Quick Suggestions
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {predefinedOptions.map((opt: string) => {
                                const isActive = tagsArr.includes(opt);
                                return (
                                  <button
                                    type="button"
                                    key={opt}
                                    onClick={() => {
                                      let updated;
                                      if (isActive) {
                                        updated = tagsArr.filter((t) => t !== opt);
                                      } else {
                                        updated = [...tagsArr, opt];
                                      }
                                      setDynamicData({
                                        ...dynamicData,
                                        [field.field_name]: updated.join(", "),
                                      });
                                    }}
                                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                                      isActive
                                        ? "bg-[#7b8e7f] border-[#7b8e7f] text-white dark:bg-[#9cb2a2] dark:border-[#9cb2a2] dark:text-[#1c1c1e]"
                                        : isDarkMode
                                        ? "bg-transparent border-[#2c2c2e] text-slate-400 hover:text-white hover:border-slate-550"
                                        : "bg-transparent border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400"
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Fallback to text or date picker
                  return (
                    <div key={field.id}>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        {fieldLabel}
                      </label>
                      <input
                        type={field.field_type === "date" ? "date" : "text"}
                        value={dynamicData[field.field_name] || ""}
                        onChange={(e) =>
                          setDynamicData({
                            ...dynamicData,
                            [field.field_name]: e.target.value,
                          })
                        }
                        className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                          isDarkMode
                            ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                            : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div
            className={`flex items-center justify-end gap-3 pt-4 border-t mt-6 ${
              isDarkMode ? "border-white/5" : "border-slate-100"
            }`}
          >
            <button
              type="button"
              disabled={submittingPerson}
              onClick={onClose}
              className={`px-4 py-2 rounded-lg border transition-all text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode
                  ? "border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                  : "border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingPerson}
              className={`px-5 py-2 rounded-lg font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode
                  ? "bg-[#f3f3f5] text-[#1c1c1e] hover:bg-white"
                  : "bg-[#1c1c1e] text-white hover:bg-slate-800"
              }`}
            >
              {submittingPerson && (
                <div
                  className={`animate-spin rounded-full h-3.5 w-3.5 border-2 border-t-transparent ${
                    isDarkMode ? "border-[#1c1c1e]" : "border-white"
                  }`}
                />
              )}
              {submittingPerson
                ? person
                  ? "Saving..."
                  : "Creating..."
                : person
                ? "Save Changes"
                : "Create Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
