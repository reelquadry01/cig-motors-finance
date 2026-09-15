import { Database, Globe, FileText, Cable } from 'lucide-react'

const CONNECTOR_TYPES = [
  { group: 'Database', items: [
    { type: 'sql', subtype: 'mysql', name: 'MySQL', desc: 'Relational database by Oracle', badge: 'My', color: '#00758F', icon: Database },
    { type: 'sql', subtype: 'postgresql', name: 'PostgreSQL', desc: 'Advanced open-source SQL', badge: 'Pg', color: '#336791', icon: Database },
    { type: 'sql', subtype: 'sqlserver', name: 'SQL Server', desc: 'Microsoft enterprise RDBMS', badge: 'SS', color: '#CC2927', icon: Database },
    { type: 'sql', subtype: 'mariadb', name: 'MariaDB', desc: 'MySQL-compatible fork', badge: 'Ma', color: '#003545', icon: Database },
    { type: 'sql', subtype: 'oracle', name: 'Oracle', desc: 'Enterprise database platform', badge: 'Or', color: '#F80000', icon: Database },
  ]},
  { group: 'ERP Systems', items: [
    { type: 'sage300', name: 'Sage 300', desc: 'Mid-market ERP suite', badge: 'S', color: '#4CAF50', icon: Globe },
    { type: 'sapb1', name: 'SAP Business One', desc: 'SMB ERP by SAP', badge: 'SAP', color: '#F0AB00', icon: Globe },
    { type: 'netsuite', name: 'Oracle NetSuite', desc: 'Cloud ERP platform', badge: 'N', color: '#FF0000', icon: Globe },
    { type: 'dynamics365', name: 'Dynamics 365', desc: 'Microsoft business suite', badge: 'D365', color: '#002050', icon: Globe },
    { type: 'quickbooks', name: 'QuickBooks', desc: 'Small business accounting', badge: 'QB', color: '#2CA01C', icon: Globe },
    { type: 'xero', name: 'Xero', desc: 'Cloud accounting software', badge: 'X', color: '#13B5EA', icon: Globe },
    { type: 'odoo', name: 'Odoo', desc: 'Open-source business apps', badge: 'O', color: '#875A7B', icon: Globe },
    { type: 'sage50', name: 'Sage 50', desc: 'Desktop accounting', badge: 'S50', color: '#4CAF50', icon: Globe },
    { type: 'epicor', name: 'Epicor', desc: 'Industry-specific ERP', badge: 'E', color: '#FF6600', icon: Globe },
    { type: 'infor', name: 'Infor', desc: 'Cloud ERP for industries', badge: 'I', color: '#005B82', icon: Globe },
  ]},
  { group: 'Other Sources', items: [
    { type: 'rest_api', name: 'REST API', desc: 'Custom HTTP endpoint', badge: 'API', color: '#6B7280', icon: Globe },
    { type: 'odbc', name: 'ODBC / JDBC', desc: 'Universal database bridge', badge: 'OD', color: '#6B7280', icon: Cable },
    { type: 'file_monitor', name: 'File Monitor', desc: 'Watch folder for changes', badge: 'FM', color: '#6B7280', icon: FileText },
  ]},
]

export default function ErpGallery({ onSelect }) {
  return (
    <div className="space-y-6">
      {CONNECTOR_TYPES.map(group => (
        <div key={group.group}>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">
            {group.group}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {group.items.map(item => (
              <ConnectorCard key={item.type + (item.subtype || '')} item={item} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ConnectorCard({ item, onSelect }) {
  const handleClick = () => {
    if (item.subtype) {
      onSelect({ type: item.type, subtype: item.subtype })
    } else {
      onSelect({ type: item.type })
    }
  }

  return (
    <button
      onClick={handleClick}
      className="group relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 text-left hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-700 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
    >
      <div
        className="w-10 h-10 rounded-lg grid place-items-center text-white text-xs font-bold mb-3"
        style={{ backgroundColor: item.color }}
      >
        {item.badge}
      </div>
      <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-tight">{item.name}</div>
      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">{item.desc}</div>
      <div className="absolute inset-0 rounded-xl bg-[#c8102e]/0 group-hover:bg-[#c8102e]/5 transition-colors duration-200" />
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span className="text-[10px] font-semibold text-[#c8102e] bg-[#c8102e]/10 px-2 py-0.5 rounded-full">Connect →</span>
      </div>
    </button>
  )
}
