import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import reportService from "../../services/reportService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const makeKey = (value = "") => value.toLowerCase().trim().replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/[^a-zA-Z0-9_]/g, "");
const emptyTemplate = { name: "", role: "", isActive: true, groups: [] };
const emptyField = { label: "", key: "", counters: [{ label: "Added", key: "added" }] };

export default function ReportTemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setTemplates(await reportService.getReportTemplates()); }
    catch (error) { toast.error(error.response?.data?.message || "Could not load report templates"); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    let active = true;
    reportService.getReportTemplates()
      .then((data) => { if (active) setTemplates(data); })
      .catch((error) => { if (active) toast.error(error.response?.data?.message || "Could not load report templates"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const updateGroup = (groupIndex, updater) => setEditing((current) => ({
    ...current,
    groups: current.groups.map((group, index) => index === groupIndex ? updater(group) : group),
  }));
  const updateField = (groupIndex, fieldIndex, updater) => updateGroup(groupIndex, (group) => ({
    ...group,
    fields: group.fields.map((field, index) => index === fieldIndex ? updater(field) : field),
  }));

  const save = async () => {
    setSaving(true);
    try {
      if (editing._id) await reportService.updateReportTemplate(editing._id, editing);
      else await reportService.createReportTemplate(editing);
      toast.success("Report template saved"); setEditing(null); await load();
    } catch (error) { toast.error(error.response?.data?.message || "Could not save report template"); }
    finally { setSaving(false); }
  };

  if (editing) return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{editing._id ? `Edit ${editing.name}` : "Create Report Template"}</h2>
        <div className="flex gap-2"><Button variant="outline" onClick={() => setEditing(null)}><X className="h-4 w-4 mr-1" />Cancel</Button><Button disabled={saving} onClick={save}><Save className="h-4 w-4 mr-1" />{saving ? "Saving..." : "Save"}</Button></div>
      </div>
      <div className="border rounded-lg p-4 grid sm:grid-cols-2 gap-4">
        <div><Label>Team / Role Name</Label><Input value={editing.name} placeholder="e.g. SEO" onChange={(e) => setEditing((v) => ({ ...v, name: e.target.value }))} /></div>
        <div><Label>Role Key</Label><Input className="font-mono" value={editing.role} placeholder="e.g. seo" onChange={(e) => setEditing((v) => ({ ...v, role: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))} /></div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing((v) => ({ ...v, isActive: e.target.checked }))} /> Active</label>
      </div>
      {editing.groups.map((group, groupIndex) => (
        <div key={group._id || `group-${groupIndex}`} className="border rounded-lg p-4 space-y-4">
          <div className="flex gap-2"><Input value={group.name} placeholder="Group name" onChange={(e) => updateGroup(groupIndex, (g) => ({ ...g, name: e.target.value }))} /><Button variant="ghost" className="text-destructive" onClick={() => setEditing((v) => ({ ...v, groups: v.groups.filter((_, i) => i !== groupIndex) }))}><Trash2 className="h-4 w-4" /></Button></div>
          {group.fields.map((field, fieldIndex) => (
            <div key={field._id || `field-${fieldIndex}`} className="bg-muted/30 rounded-lg p-3 space-y-3">
              <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2"><Input value={field.label} placeholder="Field label" onChange={(e) => updateField(groupIndex, fieldIndex, (f) => ({ ...f, label: e.target.value, key: !f.key || f.key === makeKey(f.label) ? makeKey(e.target.value) : f.key }))} /><Input className="font-mono" value={field.key} placeholder="fieldKey" onChange={(e) => updateField(groupIndex, fieldIndex, (f) => ({ ...f, key: makeKey(e.target.value) }))} /><Button variant="ghost" className="text-destructive" onClick={() => updateGroup(groupIndex, (g) => ({ ...g, fields: g.fields.filter((_, i) => i !== fieldIndex) }))}><Trash2 className="h-4 w-4" /></Button></div>
              <div className="flex flex-wrap gap-2">{field.counters.map((counter, counterIndex) => <div key={counter._id || `counter-${counterIndex}`} className="flex gap-1"><Input className="w-28 h-8" value={counter.label} placeholder="Action" onChange={(e) => updateField(groupIndex, fieldIndex, (f) => ({ ...f, counters: f.counters.map((c, i) => i === counterIndex ? { ...c, label: e.target.value, key: !c.key || c.key === makeKey(c.label) ? makeKey(e.target.value) : c.key } : c) }))} /><Input className="w-28 h-8 font-mono" value={counter.key} placeholder="actionKey" onChange={(e) => updateField(groupIndex, fieldIndex, (f) => ({ ...f, counters: f.counters.map((c, i) => i === counterIndex ? { ...c, key: makeKey(e.target.value) } : c) }))} /><Button size="icon" variant="ghost" className="h-8 w-8" disabled={field.counters.length === 1} onClick={() => updateField(groupIndex, fieldIndex, (f) => ({ ...f, counters: f.counters.filter((_, i) => i !== counterIndex) }))}><X className="h-3 w-3" /></Button></div>)}<Button size="sm" variant="outline" onClick={() => updateField(groupIndex, fieldIndex, (f) => ({ ...f, counters: [...f.counters, { label: "", key: "" }] }))}><Plus className="h-3 w-3 mr-1" />Action</Button></div>
            </div>
          ))}
          <Button variant="outline" onClick={() => updateGroup(groupIndex, (g) => ({ ...g, fields: [...g.fields, structuredClone(emptyField)] }))}><Plus className="h-4 w-4 mr-1" />Add Field</Button>
        </div>
      ))}
      <Button variant="outline" onClick={() => setEditing((v) => ({ ...v, groups: [...v.groups, { name: "", fields: [] }] }))}><Plus className="h-4 w-4 mr-1" />Add Group</Button>
    </div>
  );

  return <div className="space-y-5"><div className="flex justify-between"><div><h2 className="text-xl font-semibold">Custom Report Templates</h2><p className="text-sm text-muted-foreground">Create grouped report fields for each user role.</p></div><Button onClick={() => setEditing(structuredClone(emptyTemplate))}><Plus className="h-4 w-4 mr-1" />Create Role</Button></div>{loading ? <p>Loading...</p> : templates.map((template) => <div key={template._id} className="border rounded-lg p-4 flex justify-between items-center"><div><div className="font-medium">{template.name} <span className="text-xs font-mono text-muted-foreground">({template.role})</span></div><p className="text-sm text-muted-foreground">{template.groups.length} groups · {template.groups.reduce((sum, group) => sum + group.fields.length, 0)} fields</p></div><div className="flex"><Button variant="ghost" onClick={() => setEditing(structuredClone(template))}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" className="text-destructive" onClick={async () => { if (!confirm(`Delete ${template.name}?`)) return; await reportService.deleteReportTemplate(template._id); toast.success("Deleted"); load(); }}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>;
}
