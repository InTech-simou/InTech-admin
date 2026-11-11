import { useState } from "react";
import { Setting2 as Wrench } from 'iconsax-react';
import { CustomTable } from "../../components";
import { AssignTechnicianDrawer } from "../Requests/components";
import type { ApiRow } from "../../types";
import { useApiMutations, usePageData } from "../../hooks";
import type { ScreenPageProps } from "../../types/page";
export function Assignments(props: ScreenPageProps) {
  const data = usePageData({ ...props, page: "Assignation" });
  const [assigningRow, setAssigningRow] = useState<ApiRow | null>(null);
  const [assignNotice, setAssignNotice] = useState("");
  const unassign = useApiMutations({ base: props.base, token: props.token, title: 'assignation', refresh: data.refresh, update: { method: 'POST', path: item => `/admin/assignments/${item.type || 'domicile'}/${item.id}/unassign`, fields: [], successMessage: 'Assignation retirée. La demande est de nouveau disponible.' } });
  const columns = [
    { key: "Référence", label: "RÉFÉRENCE" },
    { key: "Client", label: "CLIENT" },
    { key: "Appareil", label: "APPAREIL" },
    { key: "Type", label: "SERVICE", pill: true },
    { key: "Statut", label: "STATUT", status: true },
    { key: "Technicien", label: "TECHNICIEN" },
    { key: "File", label: "FILE" },
  ];
  return (
    <>
    <CustomTable
      columns={columns}
      rows={data.visibleRows}
      total={data.meta?.total}
      loading={data.loading}
      error={data.error}
      onRefresh={data.refresh}
      notice={assignNotice || unassign.notice}
      rowActions={row => <><button type="button" role="menuitem" className="request-assignment-menu-item" onClick={() => setAssigningRow(row)}><Wrench size={14} /><span>Assigner à un technicien</span></button>{row.File === 'Réponse attendue' ? <button type="button" className="button subtle table-inline-action" onClick={() => unassign.edit?.(row)}>Retirer l’assignation</button> : null}</>}
      onSelect={props.onSelect}
      rowClick={false}
      emptyMessage="Aucune demande en attente d’assignation."
    />
    {assigningRow && <AssignTechnicianDrawer base={props.base} token={props.token} row={assigningRow} onClose={() => setAssigningRow(null)} onAssigned={() => { setAssigningRow(null); setAssignNotice("Demande proposée au technicien. Il doit encore accepter."); data.refresh(); window.setTimeout(() => setAssignNotice(""), 4500); }} />}
    {unassign.drawer}
    </>
  );
}
