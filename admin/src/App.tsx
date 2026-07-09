import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Settings, 
  LogOut,
  ShieldCheck,
  TrendingUp,
  Skull,
  Search,
  Edit2,
  Trash2,
  Plus,
  Megaphone,
  ShoppingBag,
  Castle,
  XCircle,
  Eye,
  TreePine,
  Map,
  Hammer,
  ShieldAlert
} from 'lucide-react'
import { 
  adminApi, 
  type DashboardStats, 
  type ItemTemplate, 
  type Character, 
  type MonsterTemplate, 
  type ResourceNodeTemplate, 
  type MarketListing, 
  type DungeonTemplate, 
  type WorldConfig,
  type Zone,
  type InventoryItem,
  type LootTableEntry,
  type CraftingRecipe,
  type RecipeIngredient,
  type UserReport
} from './api/admin'
import { useAdminStore } from './store/useAdminStore'
import axios from 'axios'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Types are now imported from ./api/admin

// --- Components ---

function Navbar() {
  const logout = useAdminStore(state => state.logout)
  const [announcement, setAnnouncement] = useState('')
  const [sending, setSending] = useState(false)

  const handleBroadcast = async () => {
    if (!announcement.trim()) return
    setSending(true)
    try {
      await adminApi.broadcast(announcement)
      setAnnouncement('')
      alert('Broadcast sent!')
    } catch {
      alert('Failed to send')
    } finally {
      setSending(false)
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-dark-800 border-b border-dark-700 flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-6 flex-1">
        <div className="flex items-center gap-2">
            <ShieldCheck className="text-accent" />
            <span className="font-pixel text-xl tracking-wider text-white">SPRITEHERO ADMIN</span>
        </div>
        
        {/* Global Broadcast Bar */}
        <div className="hidden md:flex items-center bg-dark-900 border border-dark-600 rounded-xl px-3 py-1.5 ml-8 max-w-xl flex-1 gap-3">
            <Megaphone size={16} className="text-amber-500" />
            <input 
                type="text" 
                placeholder="Send global server announcement..." 
                className="bg-transparent border-none outline-none text-xs text-white flex-1"
                value={announcement}
                onChange={e => setAnnouncement(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBroadcast()}
            />
            <button 
                onClick={handleBroadcast}
                disabled={sending}
                className="text-[10px] font-bold text-accent uppercase hover:text-white disabled:opacity-50"
            >
                {sending ? '...' : 'Send'}
            </button>
        </div>
      </div>

      <button 
        onClick={logout}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors ml-4"
      >
        <LogOut size={20} />
        <span className="text-sm font-medium">Logout</span>
      </button>
    </nav>
  )
}

function Sidebar() {
  const location = useLocation()
  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Overview' },
    { to: '/resources', icon: Package, label: 'Items' },
    { to: '/recipes', icon: Hammer, label: 'Forge Recipes' },
    { to: '/nodes', icon: TreePine, label: 'Gathering Nodes' },
    { to: '/players', icon: Users, label: 'Players' },
    { to: '/monsters', icon: Skull, label: 'Monsters' },
    { to: '/dungeons', icon: Castle, label: 'Dungeons' },
    { to: '/zones', icon: Map, label: 'World Zones' },
    { to: '/market', icon: ShoppingBag, label: 'Marketplace' },
    { to: '/config', icon: Settings, label: 'Settings' },
    { to: '/reports', icon: ShieldAlert, label: 'Signals & Feedback' },
  ]

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-dark-800 border-r border-dark-700 p-4">
      <div className="space-y-2">
        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              location.pathname === link.to 
                ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                : 'text-gray-400 hover:bg-dark-700 hover:text-white'
            )}
          >
            <link.icon size={20} />
            <span className="font-medium">{link.label}</span>
          </Link>
        ))}
      </div>
    </aside>
  )
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <div className="bg-dark-800 border border-dark-600 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-dark-700 flex justify-between items-center bg-dark-900/50">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-full text-gray-500 hover:text-white"><XCircle size={20}/></button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    )
}

// --- Pages ---

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getDashboard().then((res) => {
      setStats(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-accent"></div></div>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: stats?.userCount, icon: Users, color: 'text-blue-500' },
          { label: 'Characters', value: stats?.charCount, icon: ShieldCheck, color: 'text-green-500' },
          { label: 'Zones', value: stats?.zoneCount, icon: Map, color: 'text-emerald-500' },
          { label: 'Items', value: stats?.itemTemplateCount, icon: Package, color: 'text-purple-500' },
          { label: 'Listings', value: stats?.marketListingCount, icon: TrendingUp, color: 'text-orange-500' },
        ].map(stat => (
          <div key={stat.label} className="card flex items-center justify-between p-6">
            <div>
              <p className="text-gray-400 text-sm font-medium">{stat.label}</p>
              <p className="text-3xl font-bold text-white mt-1">{stat.value || 0}</p>
            </div>
            <div className={cn("p-4 rounded-2xl bg-dark-900 shadow-inner", stat.color)}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </div>
      
      {/* Quick Activity or Charts would go here */}
    </div>
  )
}

function Resources() {
  const [items, setItems] = useState<ItemTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<ItemTemplate | null>(null)
  const [formData, setFormData] = useState<Partial<ItemTemplate>>({
      code: '', name: '', emoji: '📦', rarityId: 'COMMON', type: 'MATERIAL', description: '', levelReq: 1
  })
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')

  const fetchItems = () => {
    adminApi.getItems().then((res) => {
      setItems(res.data)
      setLoading(false)
    })
  }

  useEffect(() => { fetchItems() }, [])

  const handleSave = async () => {
      try {
          if (editItem) {
              await adminApi.updateItem(editItem.code, formData)
          } else {
              await adminApi.createItem(formData)
          }
          setIsModalOpen(false)
          fetchItems()
          alert('Saved successfully!')
      } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          alert('Failed to save item template: ' + message)
      }

  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.code.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter ? item.type === typeFilter : true
    const matchesRarity = rarityFilter ? item.rarityId === rarityFilter : true
    return matchesSearch && matchesType && matchesRarity
  })

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">Resource Templates</h1>
        <button onClick={() => { 
            setEditItem(null); 
            setFormData({ code: '', name: '', emoji: '📦', rarityId: 'COMMON', type: 'MATERIAL', description: '', levelReq: 1, sprites: { icon: '' } });
            setIsModalOpen(true); 
        }} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Create New Item
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or code..." 
            className="input-field pl-10 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="input-field w-full bg-dark-800"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="MATERIAL">Material</option>
          <option value="EQUIPMENT">Equipment</option>
          <option value="CONSUMABLE">Consumable</option>
        </select>
        <select 
          className="input-field w-full bg-dark-800"
          value={rarityFilter}
          onChange={(e) => setRarityFilter(e.target.value)}
        >
          <option value="">All Rarities</option>
          <option value="COMMON">Common</option>
          <option value="UNCOMMON">Uncommon</option>
          <option value="RARE">Rare</option>
          <option value="EPIC">Epic</option>
          <option value="LEGENDARY">Legendary</option>
          <option value="MYTHICAL">Mythical</option>
        </select>
      </div>

      <div className="card overflow-hidden border-none shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-dark-900/80 border-b border-dark-700">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Item</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Code</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Rarity</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Level</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {filteredItems.map((item: ItemTemplate) => (
                <tr key={item.code} className="hover:bg-dark-700/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-dark-900 flex items-center justify-center border border-dark-600 shadow-inner group-hover:border-accent/50 transition-all">
                        <span className="text-xl">{item.emoji}</span>
                      </div>
                      <span className="font-semibold text-white">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400 font-mono text-[10px] uppercase">{item.code}</td>
                  <td className="px-6 py-4">
                    <span 
                      className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter" 
                      style={{ color: item.rarity?.color, backgroundColor: `${item.rarity?.color}20`, border: `1px solid ${item.rarity?.color}30` }}
                    >
                      {item.rarityId}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{item.type}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm font-bold">{item.levelReq}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => {
                          setEditItem(item);
                          setFormData({ ...item, sprites: item.sprites || { icon: '' } });
                          setIsModalOpen(true);
                      }} className="p-2 hover:bg-accent/20 rounded-lg text-accent transition-all hover:scale-110"><Edit2 size={16} /></button>
                      <button onClick={async () => {
                          if (window.confirm(`Delete ${item.name}?`)) {
                              await adminApi.deleteItem(item.code);
                              fetchItems();
                          }
                      }} className="p-2 hover:bg-rose-500/20 rounded-lg text-rose-500 transition-all hover:scale-110"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editItem ? 'Update Item' : 'New Item Definition'}>
          <div className="space-y-4 px-1">
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Item Name</label>
                      <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field w-full py-2" placeholder="Ex: Iron Ore" />
                  </div>
                  {!editItem ? (
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Unique Code</label>
                          <input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} className="input-field w-full py-2" placeholder="IRON_ORE" />
                      </div>
                  ) : (
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Code</label>
                          <input value={formData.code} disabled className="input-field w-full py-2 opacity-50 cursor-not-allowed" />
                      </div>
                  )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Emoji</label>
                    <input value={formData.emoji} onChange={e => setFormData({...formData, emoji: e.target.value})} className="input-field w-full py-2" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Rarity</label>
                    <select value={formData.rarityId} onChange={e => setFormData({...formData, rarityId: e.target.value})} className="input-field w-full py-2 bg-dark-700">
                        {['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHICAL'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Level Req</label>
                    <input type="number" value={formData.levelReq} onChange={e => setFormData({...formData, levelReq: parseInt(e.target.value)})} className="input-field w-full py-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Type</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="input-field w-full py-2 bg-dark-700">
                        {['MATERIAL', 'EQUIPMENT', 'CONSUMABLE', 'CURRENCY', 'MISC'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                {formData.type === 'EQUIPMENT' && (
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Slot</label>
                        <select value={formData.equipSlot || ''} onChange={e => setFormData({...formData, equipSlot: e.target.value})} className="input-field w-full py-2 bg-dark-700">
                            <option value="">None</option>
                            {['HEAD', 'BODY', 'LEGS', 'FEET', 'WEAPON', 'SHIELD', 'ACCESSORY'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                )}
              </div>

              {formData.type === 'EQUIPMENT' && formData.equipSlot === 'WEAPON' && (
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Class Type</label>
                    <select value={formData.classType || ''} onChange={e => setFormData({...formData, classType: e.target.value})} className="input-field w-full py-2 bg-dark-700">
                        <option value="">Any (Hybrid)</option>
                        <option value="WARRIOR">Warrior (STR scaling)</option>
                        <option value="ARCHER">Archer (AGI scaling)</option>
                        <option value="MAGE">Mage (INT scaling)</option>
                    </select>
                </div>
              )}

              {formData.type === 'CONSUMABLE' && (
                <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20 space-y-3">
                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Restoration Effects</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-500 uppercase">HP Restore</label>
                            <input 
                                type="number" 
                                value={formData.statHeal ?? 0} 
                                onChange={e => setFormData({...formData, statHeal: parseInt(e.target.value)})} 
                                className="input-field w-full py-2 text-xs" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-500 uppercase">Energy Restore</label>
                            <input 
                                type="number" 
                                value={formData.statEnergy ?? 0}
                                onChange={e => setFormData({...formData, statEnergy: parseInt(e.target.value)})} 
                                className="input-field w-full py-2 text-xs" 
                            />
                        </div>
                    </div>
                </div>
              )}

              {formData.type === 'EQUIPMENT' && (
                <>
                    <div className="p-3 bg-dark-900/50 rounded-xl border border-dark-700 space-y-3">
                        <h4 className="text-[10px] font-black text-accent uppercase tracking-widest">Base Stats</h4>
                        <div className="grid grid-cols-4 gap-3">
                            {([
                                {label: 'ATK', key: 'statAtk'}, {label: 'DEF', key: 'statDef'},
                                {label: 'STR', key: 'statStr'}, {label: 'AGI', key: 'statAgi'},
                                {label: 'INT', key: 'statInt'}, {label: 'LUK', key: 'statLuk'},
                                {label: 'DEX', key: 'statDex'}, {label: 'HEAL', key: 'statHeal'}
                            ] as const).map(stat => (
                                <div key={stat.key} className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-500 uppercase">{stat.label}</label>
                                    <input 
                                        type="number" 
                                        value={formData[stat.key] ?? 0}
                                        onChange={e => setFormData({...formData, [stat.key]: parseInt(e.target.value)})} 
                                        className="input-field w-full py-1.5 text-xs" 
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 space-y-3">
                        <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Roll Multipliers</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-500 uppercase">Min Roll (Default 0.8)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={formData.minRoll || 0.8} 
                                    onChange={e => setFormData({...formData, minRoll: parseFloat(e.target.value)})} 
                                    className="input-field w-full py-2 text-xs border-amber-500/20" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-500 uppercase">Max Roll (Default 1.2)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={formData.maxRoll || 1.2} 
                                    onChange={e => setFormData({...formData, maxRoll: parseFloat(e.target.value)})} 
                                    className="input-field w-full py-2 text-xs border-amber-500/20" 
                                />
                            </div>
                        </div>
                        <p className="text-[9px] text-gray-500 italic">Example: 0.8 to 1.2 means the final stat can be 80% to 120% of base.</p>
                    </div>
                </>
              )}

              {formData.type === 'EQUIPMENT' && (
                <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/20 space-y-3">
                    <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Unique Modifiers (%)</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-gray-500 uppercase">Life Steal</label>
                        <input type="number" step="0.1" value={formData.statLifesteal || 0} onChange={e => setFormData({...formData, statLifesteal: parseFloat(e.target.value) || 0})} className="input-field w-full py-1.5 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-gray-500 uppercase">Thorns</label>
                        <input type="number" step="0.1" value={formData.statThorns || 0} onChange={e => setFormData({...formData, statThorns: parseFloat(e.target.value) || 0})} className="input-field w-full py-1.5 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-gray-500 uppercase">Gold Bonus</label>
                        <input type="number" step="0.1" value={formData.statGoldBonus || 0} onChange={e => setFormData({...formData, statGoldBonus: parseFloat(e.target.value) || 0})} className="input-field w-full py-1.5 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-gray-500 uppercase">EXP Bonus</label>
                        <input type="number" step="0.1" value={formData.statExpBonus || 0} onChange={e => setFormData({...formData, statExpBonus: parseFloat(e.target.value) || 0})} className="input-field w-full py-1.5 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-gray-500 uppercase">Move Speed</label>
                        <input type="number" step="0.1" value={formData.statMoveSpeed || 0} onChange={e => setFormData({...formData, statMoveSpeed: parseFloat(e.target.value) || 0})} className="input-field w-full py-1.5 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-gray-500 uppercase">HP Regen</label>
                        <input type="number" step="0.1" value={formData.statHpRegen || 0} onChange={e => setFormData({...formData, statHpRegen: parseFloat(e.target.value) || 0})} className="input-field w-full py-1.5 text-xs" />
                      </div>
                    </div>
                </div>
              )}

              <div className="p-3 bg-dark-900/50 rounded-xl border border-dark-700 space-y-3">
                  <h4 className="text-[10px] font-black text-accent uppercase tracking-widest">Sprite Icon Asset</h4>
                  <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">Sprite URL / Path</label>
                      <input 
                        value={formData.sprites?.icon || ''} 
                        onChange={e => setFormData({
                          ...formData, 
                          sprites: { ...(formData.sprites || {}), icon: e.target.value }
                        })} 
                        className="input-field w-full py-2 text-xs" 
                        placeholder="Ex: /assets/sprites/items/iron_sword.png" 
                      />
                  </div>
              </div>

              <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input-field w-full py-2 h-20 text-sm" />
              </div>
              <button className="btn-primary w-full py-3 mt-4" onClick={handleSave}>Save Template</button>
          </div>
      </Modal>
    </div>
  )
}

function Players() {
  const [players, setPlayers] = useState<Character[]>([])
  const [items, setItems] = useState<ItemTemplate[]>([])
  const [search, setSearch] = useState("")
  const [selectedPlayer, setSelectedPlayer] = useState<Character | null>(null)
  const [viewingPlayer, setViewingPlayer] = useState<Character | null>(null)
  const [editData, setEditData] = useState<Partial<Character>>({})
  const [isSpawning, setIsSpawning] = useState(false)
  const [spawnItemCode, setSpawnItemCode] = useState("")
  const [spawnQty, setSpawnQty] = useState(1)
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [banTarget, setBanTarget] = useState<Character | null>(null)
  const [banReason, setBanReason] = useState("")

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId) 
        : [...prev, itemId]
    )
  }

  const handleBulkRemoveItems = async () => {
    if (!viewingPlayer || selectedItemIds.length === 0) return;
    if (!confirm(`Are you sure you want to remove ${selectedItemIds.length} selected items?`)) return;

    try {
        await adminApi.removeItems(viewingPlayer.id, selectedItemIds);
        setSelectedItemIds([]);
        // Refresh detail
        const res = await adminApi.getPlayerDetail(viewingPlayer.id);
        setViewingPlayer(res.data);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        alert('Failed to remove items: ' + message);
    }
  }

  const fetchPlayers = async () => {
    try {
        const res = await adminApi.getPlayers()
        setPlayers(res.data)
    } catch (err) {
        console.error('Failed to fetch players:', err)
    }
  }

  const fetchItems = async () => {
    try {
        const res = await adminApi.getItems()
        setItems(res.data)
    } catch (err) {
        console.error('Failed to fetch items:', err)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchPlayers()
        fetchItems()
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  const handleEditStats = async (id: string) => {
    const res = await adminApi.getPlayerDetail(id)
    setSelectedPlayer(res.data)
    setEditData(res.data)
  }

  const handleBan = async () => {
    if (!banTarget) return
    try {
      await adminApi.banPlayer(banTarget.id, banReason || undefined)
      alert(`${banTarget.name} has been banned.`)
      setBanTarget(null)
      setBanReason("")
      fetchPlayers()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      alert('Failed to ban player: ' + message)
    }
  }

  const handleUnban = async (id: string, name: string) => {
    if (!confirm(`Unban ${name}?`)) return
    try {
      await adminApi.unbanPlayer(id)
      alert(`${name} has been unbanned.`)
      fetchPlayers()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      alert('Failed to unban player: ' + message)
    }
  }

  const handleViewDetails = async (id: string) => {
    const res = await adminApi.getPlayerDetail(id)
    setViewingPlayer(res.data)
  }

  const handleSaveStats = async () => {
    if (!selectedPlayer) return
    try {
        await adminApi.updatePlayer(selectedPlayer.id, editData)
        alert('Stats updated successfully!')
        setSelectedPlayer(null)
        fetchPlayers()
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        alert('Failed to update stats: ' + message)
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    if (!viewingPlayer) return;
    if (!confirm('Are you sure you want to remove this item?')) return;

    try {
        await adminApi.removeItem(viewingPlayer.id, itemId);
        // Refresh detail
        const res = await adminApi.getPlayerDetail(viewingPlayer.id);
        setViewingPlayer(res.data);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        alert('Failed to remove item: ' + message);
    }
  }

  const handleSpawnItem = async () => {
    if (!viewingPlayer || !spawnItemCode) return;

    try {
        await adminApi.spawnItem(viewingPlayer.id, spawnItemCode, spawnQty);
        alert('Item spawned!');
        setIsSpawning(false);
        setSpawnItemCode("");
        setSpawnQty(1);
        // Refresh detail
        const res = await adminApi.getPlayerDetail(viewingPlayer.id);
        setViewingPlayer(res.data);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        alert('Failed to spawn item: ' + message);
    }
  }

  const filtered = players.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.user.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Adventurers</h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search username or character..."
            className="input-field pl-12 py-3 w-80 text-sm shadow-xl"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((player: Character) => (
          <div key={player.id} className={cn("card hover:border-accent/40 transition-all group", player.isBanned && "border-rose-500/30 bg-rose-500/5")}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {player.name}
                    {player.isBanned && (
                      <span className="text-[9px] font-black uppercase bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30">
                        BANNED
                      </span>
                    )}
                    {player.actionStatus === 'ENCOUNTER' && <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                </h3>
                <p className="text-gray-500 text-xs font-mono">{player.user.email}</p>
                {player.isBanned && player.banReason && (
                  <p className="text-rose-400/70 text-[10px] mt-1 italic">Reason: {player.banReason}</p>
                )}
              </div>
              <div className="bg-dark-900 px-3 py-1.5 rounded-xl border border-dark-700 shadow-inner">
                <span className="text-accent text-[10px] font-black uppercase tracking-widest">LVL {player.level}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 py-4 border-y border-dark-700/50">
              <div className="space-y-1">
                <p className="text-gray-500 text-[9px] font-bold uppercase tracking-tight">Treasury</p>
                <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-amber-500"/>
                    <p className="text-white font-pixel text-xs">{player.gold.toLocaleString()} G</p>
                </div>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-gray-500 text-[9px] font-bold uppercase tracking-tight">Current Task</p>
                <p className="text-white font-medium text-[10px] truncate">{player.actionStatus.replace('_', ' ')}</p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
                <button onClick={() => handleEditStats(player.id)} className="flex-1 btn-primary text-xs py-2.5 rounded-xl flex items-center justify-center gap-2">
                    <Edit2 size={14} />
                    Modify Stats
                </button>
                <button onClick={() => handleViewDetails(player.id)} className="p-2.5 bg-dark-900 border border-dark-600 rounded-xl text-gray-400 hover:text-white transition-colors">
                    <Eye size={16} />
                </button>
                {player.isBanned ? (
                  <button 
                    onClick={() => handleUnban(player.id, player.name)} 
                    className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                    title="Unban player"
                  >
                    <ShieldCheck size={16} />
                  </button>
                ) : (
                  <button 
                    onClick={() => { setBanTarget(player); setBanReason(""); }} 
                    className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
                    title="Ban player"
                  >
                    <ShieldAlert size={16} />
                  </button>
                )}
            </div>
          </div>
        ))}
      </div>

      {/* View Player Details Modal */}
      <Modal isOpen={!!viewingPlayer} onClose={() => { setViewingPlayer(null); setSelectedItemIds([]); }} title={`Character Dossier: ${viewingPlayer?.name}`}>
          <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="card bg-dark-900 shadow-inner">
                    <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Combat Status</p>
                    <div className="space-y-1">
                        <p className="text-white text-sm font-bold">HP: {viewingPlayer?.hp} / {viewingPlayer?.maxHp}</p>
                        <p className="text-accent text-[10px] font-bold">EXP: {viewingPlayer?.exp.toLocaleString()}</p>
                    </div>
                </div>
                <div className="card bg-dark-900 shadow-inner text-right">
                    <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Current Activity</p>
                    <p className="text-emerald-400 text-xs font-black uppercase tracking-widest">{viewingPlayer?.actionStatus.replace('_', ' ')}</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-[2px]">Inventory Payload</p>
                        {selectedItemIds.length > 0 && (
                            <button 
                                onClick={handleBulkRemoveItems}
                                className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500 uppercase hover:text-white bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20 transition-all"
                            >
                                <Trash2 size={12} />
                                Delete ({selectedItemIds.length})
                            </button>
                        )}
                    </div>
                    <button 
                        onClick={() => setIsSpawning(true)}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-accent uppercase hover:text-white transition-colors"
                    >
                        <Plus size={12} />
                        Spawn Item
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {viewingPlayer?.inventory?.map((inv: InventoryItem) => (
                        <div 
                            key={inv.id} 
                            onClick={() => toggleItemSelection(inv.id)}
                            className={cn(
                                "flex flex-col p-2.5 rounded-xl border relative group cursor-pointer transition-all",
                                selectedItemIds.includes(inv.id) 
                                    ? "bg-rose-500/5 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]" 
                                    : "bg-dark-900 border-dark-700 hover:border-dark-500"
                            )}
                        >
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveItem(inv.id);
                                }}
                                className="absolute top-2 right-2 p-1 text-gray-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <Trash2 size={12} />
                            </button>
                            {selectedItemIds.includes(inv.id) && (
                                <div className="absolute top-2 right-8 w-3 h-3 rounded-full bg-rose-500 border-2 border-dark-900 shadow-lg" />
                            )}
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-xl">{inv.template.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-[10px] font-bold truncate">{inv.template.name}</p>
                                    <p className="text-gray-500 text-[9px] uppercase font-black">Qty: {inv.quantity}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {inv.rolledAtk ? <span className="text-[8px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/10">⚔️ {inv.rolledAtk}</span> : null}
                                {inv.rolledDef ? <span className="text-[8px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/10">🛡️ {inv.rolledDef}</span> : null}
                                {inv.rolledStr ? <span className="text-[8px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/10">💪 {inv.rolledStr}</span> : null}
                                {inv.rolledAgi ? <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/10">💨 {inv.rolledAgi}</span> : null}
                                {inv.rolledInt ? <span className="text-[8px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/10">🧠 {inv.rolledInt}</span> : null}
                                {inv.rolledLuk ? <span className="text-[8px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/10">🍀 {inv.rolledLuk}</span> : null}
                            </div>
                        </div>
                    ))}
                    {viewingPlayer?.inventory?.length === 0 && <p className="col-span-2 text-center py-8 text-gray-600 uppercase text-[10px] font-black italic">Inventory Empty</p>}
                </div>
              </div>
          </div>
      </Modal>

      <Modal isOpen={!!selectedPlayer} onClose={() => setSelectedPlayer(null)} title={`Edit Character: ${selectedPlayer?.name}`}>
          <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                    { label: 'Level', key: 'level' },
                    { label: 'Health Points', key: 'hp' },
                    { label: 'Max Health', key: 'maxHp' },
                    { label: 'Experience', key: 'exp' },
                    { label: 'Gold Balance', key: 'gold' },
                    { label: 'Depth (km)', key: 'currentDepth' },
                    { label: 'Stat Points', key: 'statPoints' },
                    { label: 'Strength', key: 'str' },
                    { label: 'Agility', key: 'agi' },
                    { label: 'Dexterity', key: 'dex' },
                    { label: 'Intelligence', key: 'int' },
                    { label: 'Luck', key: 'luk' },
                ].map(field => (
                    <div key={field.key} className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">{field.label}</label>
                        <input 
                            type="number" 
                            value={String((editData as Record<string, unknown>)[field.key] || 0)} 
                            onChange={e => setEditData({ ...editData, [field.key]: parseInt(e.target.value) || 0 })}
                            className="input-field w-full py-2" 
                        />
                    </div>
                ))}
              </div>
              <div className="pt-4 border-t border-dark-700">
                <button className="btn-primary w-full py-3" onClick={handleSaveStats}>Commit Changes</button>
                <p className="text-center text-[9px] text-gray-500 mt-3 uppercase tracking-widest">ID: {selectedPlayer?.id}</p>
              </div>
          </div>
      </Modal>

      <Modal isOpen={isSpawning} onClose={() => setIsSpawning(false)} title={`Spawn Item for ${viewingPlayer?.name}`}>
          <div className="space-y-6">
              <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Select Item</label>
                  <select 
                    value={spawnItemCode} 
                    onChange={e => setSpawnItemCode(e.target.value)}
                    className="input-field w-full py-2.5 text-sm"
                  >
                      <option value="">Choose an item...</option>
                      {items.map(item => (
                          <option key={item.code} value={item.code}>
                              {item.emoji} {item.name} ({item.code})
                          </option>
                      ))}
                  </select>
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Quantity</label>
                  <input 
                    type="number" 
                    min="1"
                    value={spawnQty}
                    onChange={e => setSpawnQty(parseInt(e.target.value) || 1)}
                    className="input-field w-full py-2.5"
                  />
              </div>

              <div className="pt-4 border-t border-dark-700">
                  <button 
                    onClick={handleSpawnItem}
                    disabled={!spawnItemCode}
                    className="btn-primary w-full py-3 disabled:opacity-50"
                  >
                      Manifest Item
                  </button>
              </div>
          </div>
      </Modal>

      {/* Ban Confirmation Modal */}
      <Modal isOpen={!!banTarget} onClose={() => { setBanTarget(null); setBanReason(""); }} title={`Ban Player: ${banTarget?.name}`}>
          <div className="space-y-6">
              <div className="card bg-rose-500/5 border border-rose-500/20 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldAlert size={20} className="text-rose-400" />
                  <p className="text-rose-300 font-bold text-sm">Confirm Ban</p>
                </div>
                <p className="text-gray-400 text-xs">
                  This will prevent <span className="text-white font-bold">{banTarget?.name}</span> from connecting or performing any actions.
                </p>
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Reason (optional)</label>
                  <input 
                    type="text"
                    placeholder="Reason for ban..."
                    value={banReason}
                    onChange={e => setBanReason(e.target.value)}
                    className="input-field w-full py-2.5"
                  />
              </div>

              <div className="pt-4 border-t border-dark-700 flex gap-3">
                  <button 
                    onClick={() => { setBanTarget(null); setBanReason(""); }}
                    className="flex-1 bg-dark-800 border border-dark-600 text-gray-400 py-3 rounded-xl text-sm font-bold hover:text-white transition-colors"
                  >
                      Cancel
                  </button>
                  <button 
                    onClick={handleBan}
                    className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl text-sm font-bold transition-colors"
                  >
                      Ban Player
                  </button>
              </div>
          </div>
      </Modal>
    </div>
  )
}

function Recipes() {
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([])
  const [items, setItems] = useState<ItemTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editRecipe, setEditRecipe] = useState<CraftingRecipe | null>(null)
  const [formData, setFormData] = useState<Partial<CraftingRecipe>>({
      resultItemCode: '', levelReq: 1, ingredients: []
  })
  const [isItemSelectorOpen, setIsItemSelectorOpen] = useState(false)
  const [activeIngredientIndex, setActiveIngredientIndex] = useState<number | null>(null)
  const [itemSearch, setItemSearch] = useState('')
  const [itemTypeFilter, setItemTypeFilter] = useState('')
  const [selectorTarget, setSelectorTarget] = useState<'result' | 'ingredient'>('result')

  const fetchData = async () => {
    try {
        const [rRes, iRes] = await Promise.all([adminApi.getRecipes(), adminApi.getItems()]);
        setRecipes(rRes.data);
        setItems(iRes.data);
        setLoading(false);
    } catch {
        setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(fetchData, 0)
    return () => clearTimeout(timer)
  }, [])

  const handleSave = async () => {
      try {
          if (!formData.resultItemCode) {
              alert("Must select a result item");
              return;
          }
          if (editRecipe) {
              await adminApi.updateRecipe(editRecipe.id, formData)
          } else {
              await adminApi.createRecipe(formData)
          }
          setIsModalOpen(false)
          fetchData()
          alert('Recipe saved successfully!')
      } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          alert('Action failed: ' + message)
      }
  }

  const addIngredientRow = () => {
      setFormData({
          ...formData,
          ingredients: [...(formData.ingredients || []), { itemCode: items[0]?.code || '', quantity: 1 }]
      })
  }

  const updateIngredientRow = (index: number, field: string, value: string | number) => {
      const newIngs = [...(formData.ingredients || [])];
      const row = (newIngs[index] as unknown) as Record<string, unknown>;
      if (field === 'quantity') row[field] = parseInt(String(value)) || 1;
      else row[field] = value;
      setFormData({ ...formData, ingredients: newIngs })
  }

  const removeIngredientRow = (index: number) => {
      const newIngs = (formData.ingredients || []).filter((_, i: number) => i !== index);
      setFormData({ ...formData, ingredients: newIngs })
  }

  const handleDelete = async (id: string) => {
      if (confirm('Permanently delete this recipe?')) {
          try {
              await adminApi.deleteRecipe(id);
              fetchData();
          } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              alert('Failed to delete recipe: ' + message);
          }
      }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">Forge Recipes</h1>
        <button onClick={() => {
            setEditRecipe(null);
            setFormData({ resultItemCode: '', levelReq: 1, ingredients: [] });
            setIsModalOpen(true);
        }} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Create Recipe
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe: CraftingRecipe) => (
              <div key={recipe.id} className="card border-t-4 border-t-blue-500 flex flex-col group relative overflow-hidden">
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => {
                          setEditRecipe(recipe);
                          setFormData({
                              resultItemCode: recipe.resultItemCode,
                              levelReq: recipe.levelReq,
                              ingredients: recipe.ingredients || []
                          });
                          setIsModalOpen(true);
                      }} className="p-2 bg-dark-900 rounded-lg text-accent hover:text-white border border-dark-600"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(recipe.id)} className="p-2 bg-dark-900 rounded-lg text-rose-500 hover:text-white border border-dark-600"><Trash2 size={14} /></button>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                      <span className="text-4xl">{recipe.resultItem?.emoji || "⚒️"}</span>
                      <div>
                          <h3 className="text-lg font-bold text-white uppercase tracking-tight">{recipe.resultItem?.name || recipe.resultItemCode}</h3>
                          <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">LVL {recipe.levelReq}</span>
                      </div>
                  </div>
                  
                  <div className="mt-auto">
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Ingredients ({recipe.ingredients?.length || 0})</p>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                          {recipe.ingredients?.map((ing: RecipeIngredient, idx: number) => (
                              <div key={idx} className="bg-dark-900 px-2 py-1.5 rounded-lg border border-dark-700 flex items-center gap-2 hover:border-accent/40 transition-colors">
                                  <span className="text-sm">{ing.item?.emoji}</span>
                                  <span className="text-white text-[10px] font-medium flex-1 truncate">{ing.item?.name}</span>
                                  <span className="text-[10px] text-gray-400 font-mono">x{ing.quantity}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editRecipe ? 'Update Recipe' : 'New Recipe'}>
          <div className="space-y-4">
              <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Result Item</label>
                  <button
                      className="bg-dark-800 text-left px-3 py-2 rounded border border-dark-600 text-sm text-white w-full hover:border-accent/50 truncate flex items-center gap-2"
                      onClick={() => {
                          setSelectorTarget('result');
                          setIsItemSelectorOpen(true);
                          setItemSearch('');
                          setItemTypeFilter('');
                      }}
                  >
                      {items.find(i => i.code === formData.resultItemCode) ? (
                          <>{items.find(i => i.code === formData.resultItemCode)?.emoji} {items.find(i => i.code === formData.resultItemCode)?.name}</>
                      ) : (
                          <span className="text-gray-500">Select Item...</span>
                      )}
                  </button>
              </div>

              <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Level Required</label>
                  <input type="number" value={formData.levelReq} onChange={e => setFormData({...formData, levelReq: parseInt(e.target.value) || 1})} className="input-field w-full py-2" />
              </div>

              <div className="space-y-3 pt-4 border-t border-dark-700">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-blue-500 uppercase">Ingredients</label>
                    <button onClick={addIngredientRow} className="text-[10px] font-bold text-accent hover:text-white flex items-center gap-1">
                        <Plus size={12} /> Add Material
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                      {formData.ingredients?.map((ing: RecipeIngredient, idx: number) => (
                          <div key={idx} className="flex gap-2 items-center bg-dark-900 p-2 rounded-xl border border-dark-700 flex-wrap">
                              <button
                                  className="bg-dark-800 text-left px-3 py-1.5 rounded border border-dark-600 text-xs text-white w-full sm:w-auto sm:flex-1 hover:border-accent/50 truncate"
                                  onClick={() => {
                                      setSelectorTarget('ingredient');
                                      setActiveIngredientIndex(idx);
                                      setIsItemSelectorOpen(true);
                                      setItemSearch('');
                                      setItemTypeFilter('');
                                  }}
                              >
                                  {items.find(i => i.code === ing.itemCode) ? (
                                      <>{items.find(i => i.code === ing.itemCode)?.emoji} {items.find(i => i.code === ing.itemCode)?.name}</>
                                  ) : (
                                      <span className="text-gray-500">Select Material...</span>
                                  )}
                              </button>
                              <div className="flex gap-2 w-full sm:w-auto">
                                  <input 
                                      type="number" 
                                      value={ing.quantity} 
                                      onChange={e => updateIngredientRow(idx, 'quantity', e.target.value)}
                                      className="bg-dark-800 border border-dark-600 rounded px-2 py-1 text-[10px] text-white w-14"
                                      placeholder="Qty"
                                      title="Quantity"
                                  />
                                  <button onClick={() => removeIngredientRow(idx)} className="text-rose-500 hover:text-white p-1 ml-auto">
                                      <Trash2 size={14} />
                                  </button>
                              </div>
                          </div>
                      ))}
                      {formData.ingredients?.length === 0 && <p className="text-center py-4 text-[10px] text-gray-600 italic">No materials required yet</p>}
                  </div>
              </div>

              <button className="btn-primary w-full py-3" onClick={handleSave}>Confirm Recipe</button>
          </div>
      </Modal>

      <Modal isOpen={isItemSelectorOpen} onClose={() => setIsItemSelectorOpen(false)} title="Select Item">
          <div className="space-y-4">
              <div className="flex gap-2">
                  <input
                      type="text"
                      placeholder="Search items..."
                      className="input-field flex-1 py-2"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                  />
                  <select
                      className="input-field py-2 bg-dark-800 text-white"
                      value={itemTypeFilter}
                      onChange={(e) => setItemTypeFilter(e.target.value)}
                  >
                      <option value="">All Types</option>
                      <option value="EQUIPMENT">Equipment</option>
                      <option value="CONSUMABLE">Consumable</option>
                      <option value="MATERIAL">Material</option>
                  </select>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1 border border-dark-700 rounded-xl p-1 bg-dark-900">
                  {items
                      .filter(i => itemTypeFilter ? i.type === itemTypeFilter : true)
                      .filter(i => 
                          i.name.toLowerCase().includes(itemSearch.toLowerCase()) || 
                          i.code.toLowerCase().includes(itemSearch.toLowerCase())
                      )
                      .map(item => (
                          <button
                              key={item.code}
                              onClick={() => {
                                  if (selectorTarget === 'result') {
                                      setFormData({ ...formData, resultItemCode: item.code });
                                  } else if (selectorTarget === 'ingredient' && activeIngredientIndex !== null) {
                                      updateIngredientRow(activeIngredientIndex, 'itemCode', item.code);
                                  }
                                  setIsItemSelectorOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-dark-800 rounded-lg flex items-center justify-between group transition-colors"
                          >
                              <div className="flex items-center gap-3">
                                  <span className="text-lg">{item.emoji}</span>
                                  <div>
                                      <p className="text-white text-sm font-bold group-hover:text-accent transition-colors">{item.name}</p>
                                      <p className="text-[10px] text-gray-500 font-mono">{item.code}</p>
                                  </div>
                              </div>
                              <span 
                                  className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter" 
                                  style={{ color: item.rarity?.color, backgroundColor: `${item.rarity?.color}20`, border: `1px solid ${item.rarity?.color}30` }}
                              >
                                  {item.rarityId}
                              </span>
                          </button>
                      ))
                  }
                  {items.filter(i => itemTypeFilter ? i.type === itemTypeFilter : true).filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.code.toLowerCase().includes(itemSearch.toLowerCase())).length === 0 && (
                      <p className="text-center py-4 text-[10px] text-gray-500 uppercase tracking-widest font-black">No items found</p>
                  )}
              </div>
          </div>
      </Modal>
    </div>
  )
}

function Nodes() {
  const [nodes, setNodes] = useState<ResourceNodeTemplate[]>([])
  const [items, setItems] = useState<ItemTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editNode, setEditNode] = useState<ResourceNodeTemplate | null>(null)
  const [formData, setFormData] = useState<Partial<ResourceNodeTemplate>>({
      name: '', type: 'Mining', icon: '⛏️', baseHp: 20, xpReward: 5, lootTable: []
  })
  const [isItemSelectorOpen, setIsItemSelectorOpen] = useState(false)
  const [activeLootIndex, setActiveLootIndex] = useState<number | null>(null)
  const [itemSearch, setItemSearch] = useState('')
  const [itemTypeFilter, setItemTypeFilter] = useState('')

  const fetchData = async () => {
    try {
        const [nRes, iRes] = await Promise.all([adminApi.getResourceNodes(), adminApi.getItems()]);
        setNodes(nRes.data);
        setItems(iRes.data);
        setLoading(false);
    } catch {
        setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(fetchData, 0)
    return () => clearTimeout(timer)
  }, [])

  const handleSave = async () => {
      try {
          if (editNode) {
              await adminApi.updateResourceNode(editNode.id, formData)
          } else {
              await adminApi.createResourceNode(formData)
          }
          setIsModalOpen(false)
          fetchData()
          alert('Node saved successfully!')
      } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          alert('Action failed: ' + message)
      }
  }

  const addLootRow = () => {
      setFormData({
          ...formData,
          lootTable: [...(formData.lootTable || []), { itemCode: items[0]?.code || '', chance: 0.1, minQuantity: 1, maxQuantity: 1 }]
      })
  }

  const updateLootRow = (index: number, field: string, value: string | number) => {
      const newLoot = [...(formData.lootTable || [])];
      const row = (newLoot[index] as unknown) as Record<string, unknown>;
      if (field === 'chance') row[field] = parseFloat(String(value)) || 0;
      else if (field === 'minQuantity' || field === 'maxQuantity') row[field] = parseInt(String(value)) || 1;
      else row[field] = value;
      setFormData({ ...formData, lootTable: newLoot })
  }

  const removeLootRow = (index: number) => {
      const newLoot = (formData.lootTable || []).filter((_, i: number) => i !== index);
      setFormData({ ...formData, lootTable: newLoot })
  }

  const handleDelete = async (id: string) => {
      if (confirm('Permanently delete this gathering node?')) {
          try {
              await adminApi.deleteResourceNode(id);
              fetchData();
          } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              alert('Failed to delete node: ' + message);
          }
      }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">Gathering Nodes</h1>
        <button onClick={() => {
            setEditNode(null);
            setFormData({ name: '', type: 'Mining', icon: '⛏️', baseHp: 20, xpReward: 5, lootTable: [], sprites: { icon: '' } });
            setIsModalOpen(true);
        }} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Create Node
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nodes.map((node: ResourceNodeTemplate) => (
              <div key={node.id} className="card border-t-4 border-t-emerald-500 flex flex-col group relative overflow-hidden">
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => {
                          setEditNode(node);
                          setFormData({
                              name: node.name,
                              type: node.type,
                              icon: node.icon,
                              baseHp: node.baseHp,
                              xpReward: node.xpReward,
                              lootTable: node.lootTable || [],
                              sprites: node.sprites || { icon: '' }
                          });
                          setIsModalOpen(true);
                      }} className="p-2 bg-dark-900 rounded-lg text-accent hover:text-white border border-dark-600"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(node.id)} className="p-2 bg-dark-900 rounded-lg text-rose-500 hover:text-white border border-dark-600"><Trash2 size={14} /></button>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                      <span className="text-4xl">{node.icon}</span>
                      <div>
                          <h3 className="text-lg font-bold text-white uppercase tracking-tight">{node.name}</h3>
                          <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">{node.type}</span>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4 bg-dark-900/50 p-3 rounded-xl border border-dark-700">
                      <div>
                          <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-1 font-bold">Durability (HP)</p>
                          <p className="text-white font-mono text-sm">{node.baseHp}</p>
                      </div>
                      <div>
                          <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-1 font-bold">EXP Reward</p>
                          <p className="text-emerald-400 font-mono text-sm">+{node.xpReward}</p>
                      </div>
                  </div>
                  
                  <div className="mt-auto">
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Drop Tables ({node.lootTable?.length || 0})</p>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                          {node.lootTable?.map((l: LootTableEntry) => (
                              <div key={l.id} className="bg-dark-900 px-2 py-1.5 rounded-lg border border-dark-700 flex items-center gap-2 hover:border-accent/40 transition-colors">
                                  <span className="text-sm">{l.item?.emoji}</span>
                                  <span className="text-white text-[10px] font-medium flex-1 truncate">{l.item?.name}</span>
                                  <span className="text-[10px] text-gray-400 font-mono">x{l.minQuantity}{l.maxQuantity > l.minQuantity ? `-${l.maxQuantity}` : ''}</span>
                                  <span className="text-[10px] text-emerald-400 font-bold">{(l.chance * 100).toFixed(1)}%</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editNode ? 'Update Node' : 'New Gathering Node'}>
          <div className="space-y-4">
              <div className="grid grid-cols-[auto_1fr] gap-4">
                  <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Icon</label>
                      <input value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} className="input-field w-16 py-2 text-center text-xl" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Name</label>
                      <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field w-full py-2" placeholder="Ex: Iron Outcrop" />
                  </div>
              </div>

              <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="input-field w-full py-2">
                      <option value="Mining">Mining</option>
                      <option value="Woodcutting">Woodcutting</option>
                      <option value="Harvesting">Harvesting</option>
                      <option value="Fishing">Fishing</option>
                  </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Base HP</label>
                      <input type="number" value={formData.baseHp} onChange={e => setFormData({...formData, baseHp: parseInt(e.target.value) || 1})} className="input-field w-full py-2" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">EXP Reward</label>
                      <input type="number" value={formData.xpReward} onChange={e => setFormData({...formData, xpReward: parseInt(e.target.value) || 0})} className="input-field w-full py-2" />
                  </div>
              </div>

              {/* 🎁 Loot Table Editor Section */}
              <div className="space-y-3 pt-4 border-t border-dark-700">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-emerald-500 uppercase">Resource Drops</label>
                    <button onClick={addLootRow} className="text-[10px] font-bold text-accent hover:text-white flex items-center gap-1">
                        <Plus size={12} /> Add Item
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                      {formData.lootTable?.map((loot: LootTableEntry, idx: number) => (
                          <div key={idx} className="flex gap-2 items-center bg-dark-900 p-2 rounded-xl border border-dark-700 flex-wrap">
                              <button
                                  className="bg-dark-800 text-left px-3 py-1.5 rounded border border-dark-600 text-xs text-white w-full sm:w-auto sm:flex-1 hover:border-accent/50 truncate"
                                  onClick={() => {
                                      setActiveLootIndex(idx);
                                      setIsItemSelectorOpen(true);
                                      setItemSearch('');
                                      setItemTypeFilter('');
                                  }}
                              >
                                  {items.find(i => i.code === loot.itemCode) ? (
                                      <>{items.find(i => i.code === loot.itemCode)?.emoji} {items.find(i => i.code === loot.itemCode)?.name}</>
                                  ) : (
                                      <span className="text-gray-500">Select Item...</span>
                                  )}
                              </button>
                              <div className="flex gap-2 w-full sm:w-auto">
                                  <input 
                                      type="number" 
                                      step="0.01"
                                      value={loot.chance} 
                                      onChange={e => updateLootRow(idx, 'chance', e.target.value)}
                                      className="bg-dark-800 border border-dark-600 rounded px-2 py-1 text-[10px] text-white w-16"
                                      placeholder="Chance"
                                      title="Drop Chance (0.0 to 1.0)"
                                  />
                                  <input 
                                      type="number" 
                                      value={loot.minQuantity} 
                                      onChange={e => updateLootRow(idx, 'minQuantity', e.target.value)}
                                      className="bg-dark-800 border border-dark-600 rounded px-2 py-1 text-[10px] text-white w-14"
                                      placeholder="Min"
                                      title="Min Quantity"
                                  />
                                  <input 
                                      type="number" 
                                      value={loot.maxQuantity} 
                                      onChange={e => updateLootRow(idx, 'maxQuantity', e.target.value)}
                                      className="bg-dark-800 border border-dark-600 rounded px-2 py-1 text-[10px] text-white w-14"
                                      placeholder="Max"
                                      title="Max Quantity"
                                  />
                                  <button onClick={() => removeLootRow(idx)} className="text-rose-500 hover:text-white p-1 ml-auto">
                                      <Trash2 size={14} />
                                  </button>
                              </div>
                          </div>
                      ))}
                      {formData.lootTable?.length === 0 && <p className="text-center py-4 text-[10px] text-gray-600 italic">No resources defined for this node</p>}
                  </div>
              </div>

              <div className="p-3 bg-dark-900/50 rounded-xl border border-dark-700 space-y-3">
                  <h4 className="text-[10px] font-black text-accent uppercase tracking-widest">Sprite Icon Asset</h4>
                  <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">Sprite URL / Path</label>
                      <input 
                        value={formData.sprites?.icon || ''} 
                        onChange={e => setFormData({
                          ...formData, 
                          sprites: { ...(formData.sprites || {}), icon: e.target.value }
                        })} 
                        className="input-field w-full py-2 text-xs" 
                        placeholder="Ex: /assets/sprites/nodes/iron_ore.png" 
                      />
                  </div>
              </div>

              <button className="btn-primary w-full py-3" onClick={handleSave}>Confirm Node</button>
          </div>
      </Modal>

      {/* Item Selection Modal */}
      <Modal isOpen={isItemSelectorOpen} onClose={() => setIsItemSelectorOpen(false)} title="Select Loot Item">
          <div className="space-y-4">
              <div className="flex gap-2">
                  <input
                      type="text"
                      placeholder="Search items..."
                      className="input-field flex-1 py-2"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                  />
                  <select
                      className="input-field py-2 bg-dark-800 text-white"
                      value={itemTypeFilter}
                      onChange={(e) => setItemTypeFilter(e.target.value)}
                  >
                      <option value="">All Types</option>
                      <option value="EQUIPMENT">Equipment</option>
                      <option value="CONSUMABLE">Consumable</option>
                      <option value="MATERIAL">Material</option>
                  </select>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1 border border-dark-700 rounded-xl p-1 bg-dark-900">
                  {items
                      .filter(i => itemTypeFilter ? i.type === itemTypeFilter : true)
                      .filter(i => 
                          i.name.toLowerCase().includes(itemSearch.toLowerCase()) || 
                          i.code.toLowerCase().includes(itemSearch.toLowerCase())
                      )
                      .map(item => (
                          <button
                              key={item.code}
                              onClick={() => {
                                  if (activeLootIndex !== null) {
                                      updateLootRow(activeLootIndex, 'itemCode', item.code);
                                  }
                                  setIsItemSelectorOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-dark-800 rounded-lg flex items-center justify-between group transition-colors"
                          >
                              <div className="flex items-center gap-3">
                                  <span className="text-lg">{item.emoji}</span>
                                  <div>
                                      <p className="text-white text-sm font-bold group-hover:text-accent transition-colors">{item.name}</p>
                                      <p className="text-[10px] text-gray-500 font-mono">{item.code}</p>
                                  </div>
                              </div>
                              <span 
                                  className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter" 
                                  style={{ color: item.rarity?.color, backgroundColor: `${item.rarity?.color}20`, border: `1px solid ${item.rarity?.color}30` }}
                              >
                                  {item.rarityId}
                              </span>
                          </button>
                      ))
                  }
                  {items.filter(i => itemTypeFilter ? i.type === itemTypeFilter : true).filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.code.toLowerCase().includes(itemSearch.toLowerCase())).length === 0 && (
                      <p className="text-center py-4 text-[10px] text-gray-500 uppercase tracking-widest font-black">No items found</p>
                  )}
              </div>
          </div>
      </Modal>
    </div>
  )
}

function Monsters() {
  const [monsters, setMonsters] = useState<MonsterTemplate[]>([])
  const [items, setItems] = useState<ItemTemplate[]>([])
  const [dungeons, setDungeons] = useState<DungeonTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editMonster, setEditMonster] = useState<MonsterTemplate | null>(null)
  const [formData, setFormData] = useState<Partial<MonsterTemplate>>({
      name: '', hp: 100, attack: 10, defense: 5, expReward: 50, goldReward: 10, minGoldMult: 0.8, maxGoldMult: 1.2, minDepth: 0, isBoss: false, dungeonId: null, lootTable: []
  })
  const [isItemSelectorOpen, setIsItemSelectorOpen] = useState(false)
  const [activeLootIndex, setActiveLootIndex] = useState<number | null>(null)
  const [itemSearch, setItemSearch] = useState('')
  const [itemTypeFilter, setItemTypeFilter] = useState('')

  const fetchData = async () => {
    try {
        const [mRes, iRes, dRes] = await Promise.all([
            adminApi.getMonsters(), 
            adminApi.getItems(),
            adminApi.getDungeons()
        ]);
        setMonsters(mRes.data);
        setItems(iRes.data);
        setDungeons(dRes.data);
        setLoading(false);
    } catch {
        setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(fetchData, 0)
    return () => clearTimeout(timer)
  }, [])

  const handleSave = async () => {
      try {
          if (editMonster) {
              await adminApi.updateMonster(editMonster.id, formData)
          } else {
              await adminApi.createMonster(formData)
          }
          setIsModalOpen(false)
          fetchData()
          alert('Monster saved successfully!')
      } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          alert('Action failed: ' + message)
      }

  }

  const addLootRow = () => {
      setFormData({
          ...formData,
          lootTable: [...(formData.lootTable || []), { itemCode: items[0]?.code || '', chance: 0.1, minQuantity: 1, maxQuantity: 1 }]
      })
  }

  const updateLootRow = (index: number, field: string, value: string | number) => {
      const newLoot = [...(formData.lootTable || [])];
      const row = (newLoot[index] as unknown) as Record<string, unknown>;
      row[field] = value;
      setFormData({ ...formData, lootTable: newLoot });
  }

  const removeLootRow = (index: number) => {
      setFormData({
          ...formData,
          lootTable: (formData.lootTable || []).filter((_, i: number) => i !== index)
      })
  }

  const handleDelete = async (id: string) => {
    if (confirm("Delete this monster template? This cannot be undone.")) {
      await adminApi.deleteMonster(id)
      setMonsters(monsters.filter(m => m.id !== id))
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Bestiary Registry</h1>
        <button onClick={() => {
            setEditMonster(null);
            setFormData({ name: '', hp: 100, attack: 10, defense: 5, expReward: 50, goldReward: 10, minGoldMult: 0.8, maxGoldMult: 1.2, minDepth: 0, isBoss: false, dungeonId: null, lootTable: [], sprites: { idle: '', walk: '', attack: '' } });
            setIsModalOpen(true);
        }} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Forge New Beast
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {monsters.map((monster: MonsterTemplate) => (
          <div key={monster.id} className="card relative group border-none shadow-xl bg-gradient-to-br from-dark-800 to-dark-900">
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button onClick={() => {
                    setEditMonster(monster);
                    setFormData({
                        ...monster,
                        lootTable: monster.lootTable.map((l: LootTableEntry) => ({ itemCode: l.itemCode, chance: l.chance, minQuantity: l.minQuantity, maxQuantity: l.maxQuantity })),
                        sprites: monster.sprites || { idle: '', walk: '', attack: '' }
                    });
                    setIsModalOpen(true);
                }} className="p-2 bg-dark-900 rounded-lg text-accent hover:text-white border border-dark-600"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(monster.id)} className="p-2 bg-dark-900 rounded-lg text-rose-500 hover:text-white border border-dark-600"><Trash2 size={14} /></button>
            </div>
            
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-2xl border border-rose-500/20 shadow-inner">
                    {monster.isBoss ? '👑' : '💀'}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-white leading-none truncate">{monster.name}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {!monster.dungeonId ? (
                            <span className="text-[7px] uppercase font-black bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">Open World</span>
                        ) : (
                            <span className="text-[7px] uppercase font-black bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">
                                {monster.isBoss ? 'Dungeon Boss' : 'Dungeon Mob'} • {dungeons.find(d => d.id === monster.dungeonId)?.name}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-dark-900/50 p-2 rounded-xl border border-dark-700">
                    <p className="text-[8px] text-gray-500 uppercase font-black">HP Pool</p>
                    <p className="text-white text-xs font-bold">{monster.hp.toLocaleString()}</p>
                </div>
                <div className="bg-dark-900/50 p-2 rounded-xl border border-dark-700">
                    <p className="text-[8px] text-gray-500 uppercase font-black">Depth Required</p>
                    <p className="text-white text-xs font-bold">{monster.minDepth}km</p>
                </div>
            </div>
            
            <div className="space-y-2 border-t border-dark-700 pt-4">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 font-medium">Attack Strength</span>
                <span className="text-orange-400 font-bold">{monster.attack}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 font-medium">Defense Class</span>
                <span className="text-blue-400 font-bold">{monster.defense}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 font-medium">Soul EXP Reward</span>
                <span className="text-emerald-400 font-bold">{monster.expReward}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 font-medium">Gold Bounty</span>
                <span className="text-amber-400 font-bold">{monster.goldReward} G <span className="text-[10px] text-gray-500">({Math.floor(monster.goldReward * monster.minGoldMult)} - {Math.floor(monster.goldReward * monster.maxGoldMult)})</span></span>
              </div>
            </div>

            {monster.lootTable?.length > 0 && (
                <div className="mt-6 pt-4 border-t border-dark-700/50">
                    <p className="text-[9px] text-gray-500 uppercase mb-3 font-black tracking-wider">Loot Intelligence</p>
                    <div className="flex flex-wrap gap-2">
                        {monster.lootTable.map((l: LootTableEntry) => (
                            <div key={l.id} className="bg-dark-900 px-2 py-1.5 rounded-lg border border-dark-700 flex items-center gap-2 hover:border-accent/40 transition-colors cursor-help">
                                <span className="text-sm">{l.item?.emoji}</span>
                                <div className="h-3 w-[1px] bg-dark-600" />
                                <span className="text-[10px] text-gray-300 font-bold">{(l.chance * 100).toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editMonster ? 'Update Monster' : 'New Beast Blueprint'}>
          <div className="space-y-6">
              <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Beast Name</label>
                  <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field w-full py-2" placeholder="Ex: Shadow Stalker" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">HP Pool</label>
                    <input type="number" value={formData.hp} onChange={e => setFormData({...formData, hp: parseInt(e.target.value) || 0})} className="input-field w-full py-2" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Min Depth (km)</label>
                    <input type="number" value={formData.minDepth} onChange={e => setFormData({...formData, minDepth: parseInt(e.target.value) || 0})} className="input-field w-full py-2" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Attack</label>
                    <input type="number" value={formData.attack} onChange={e => setFormData({...formData, attack: parseInt(e.target.value) || 0})} className="input-field w-full py-2" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Defense</label>
                    <input type="number" value={formData.defense} onChange={e => setFormData({...formData, defense: parseInt(e.target.value) || 0})} className="input-field w-full py-2" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">EXP Reward</label>
                    <input type="number" value={formData.expReward} onChange={e => setFormData({...formData, expReward: parseInt(e.target.value) || 0})} className="input-field w-full py-2" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Gold Reward</label>
                    <input type="number" value={formData.goldReward} onChange={e => setFormData({...formData, goldReward: parseInt(e.target.value) || 0})} className="input-field w-full py-2" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Min Gold %</label>
                    <input type="number" step="0.1" value={formData.minGoldMult} onChange={e => setFormData({...formData, minGoldMult: parseFloat(e.target.value) || 0})} className="input-field w-full py-2" placeholder="0.8" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Max Gold %</label>
                    <input type="number" step="0.1" value={formData.maxGoldMult} onChange={e => setFormData({...formData, maxGoldMult: parseFloat(e.target.value) || 0})} className="input-field w-full py-2" placeholder="1.2" />
                </div>
              </div>

              <div className="p-4 bg-dark-900/50 rounded-2xl border border-dark-700 space-y-4">
                <label className="text-[10px] font-black text-accent uppercase tracking-widest">Sprite & Animations (URLs)</label>
                <div className="space-y-3">
                  <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">Idle Sprite</label>
                      <input 
                        value={formData.sprites?.idle || ''} 
                        onChange={e => setFormData({
                          ...formData, 
                          sprites: { ...(formData.sprites || {}), idle: e.target.value }
                        })} 
                        className="input-field w-full py-2 text-xs" 
                        placeholder="Ex: /assets/sprites/orc_idle.gif or https://..." 
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">Walk/Run Sprite</label>
                      <input 
                        value={formData.sprites?.walk || ''} 
                        onChange={e => setFormData({
                          ...formData, 
                          sprites: { ...(formData.sprites || {}), walk: e.target.value }
                        })} 
                        className="input-field w-full py-2 text-xs" 
                        placeholder="Ex: /assets/sprites/orc_walk.gif" 
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">Attack Sprite</label>
                      <input 
                        value={formData.sprites?.attack || ''} 
                        onChange={e => setFormData({
                          ...formData, 
                          sprites: { ...(formData.sprites || {}), attack: e.target.value }
                        })} 
                        className="input-field w-full py-2 text-xs" 
                        placeholder="Ex: /assets/sprites/orc_attack.gif" 
                      />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-dark-900/50 rounded-2xl border border-dark-700 space-y-4">
                <label className="text-[10px] font-black text-accent uppercase tracking-widest">Assignment & Role</label>
                <div className="flex flex-wrap gap-6">
                    <label className={cn(
                        "flex items-center gap-2 cursor-pointer group",
                        formData.dungeonId && monsters.find(m => m.dungeonId === formData.dungeonId && m.isBoss && m.id !== editMonster?.id) && !formData.isBoss && "opacity-50 cursor-not-allowed"
                    )}>
                        <input 
                            type="checkbox" 
                            checked={formData.isBoss} 
                            disabled={!!(formData.dungeonId && monsters.find(m => m.dungeonId === formData.dungeonId && m.isBoss && m.id !== editMonster?.id) && !formData.isBoss)}
                            onChange={e => setFormData({...formData, isBoss: e.target.checked})}
                            className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-accent focus:ring-accent disabled:opacity-50"
                        />
                        <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors uppercase">Elite Boss Unit</span>
                    </label>
                </div>
                
                {formData.dungeonId && monsters.find(m => m.dungeonId === formData.dungeonId && m.isBoss && m.id !== editMonster?.id) && !formData.isBoss && (
                    <p className="text-[9px] text-amber-500 font-bold uppercase bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                        ⚠️ This dungeon already has a boss assigned: {monsters.find(m => m.dungeonId === formData.dungeonId && m.isBoss)?.name}
                    </p>
                )}

                <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Spawn Location</label>
                    <select 
                        value={formData.dungeonId || ''} 
                        onChange={e => {
                            const newDungeonId = e.target.value || null;
                            // If switching to a dungeon that already has a boss, and this monster WAS a boss, un-boss it
                            const dungeonAlreadyHasBoss = newDungeonId && monsters.find(m => m.dungeonId === newDungeonId && m.isBoss && m.id !== editMonster?.id);
                            setFormData({
                                ...formData, 
                                dungeonId: newDungeonId,
                                isBoss: dungeonAlreadyHasBoss ? false : formData.isBoss
                            });
                        }}
                        className="input-field w-full py-2 bg-dark-800"
                    >
                        <option value="">Open World (Wilderness)</option>
                        {dungeons.map(d => (
                            <option key={d.id} value={d.id}>Dungeon: {d.name}</option>
                        ))}
                    </select>
                </div>
              </div>

              {/* 🎁 Loot Table Editor Section */}
              <div className="space-y-3 pt-4 border-t border-dark-700">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-amber-500 uppercase">Drop Intelligence</label>
                    <button onClick={addLootRow} className="text-[10px] font-bold text-accent hover:text-white flex items-center gap-1">
                        <Plus size={12} /> Add Item
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                      {formData.lootTable?.map((loot: LootTableEntry, idx: number) => (
                          <div key={idx} className="flex gap-2 items-center bg-dark-900 p-2 rounded-xl border border-dark-700">
                              <button
                                  className="bg-dark-800 text-left px-3 py-1.5 rounded border border-dark-600 text-xs text-white flex-1 hover:border-accent/50 truncate"
                                  onClick={() => {
                                      setActiveLootIndex(idx);
                                      setIsItemSelectorOpen(true);
                                      setItemSearch('');
                                      setItemTypeFilter('');
                                  }}
                              >
                                  {items.find(i => i.code === loot.itemCode) ? (
                                      <>{items.find(i => i.code === loot.itemCode)?.emoji} {items.find(i => i.code === loot.itemCode)?.name}</>
                                  ) : (
                                      <span className="text-gray-500">Select Item...</span>
                                  )}
                              </button>
                              <div className="w-20">
                                  <input 
                                      type="number" 
                                      step="0.01"
                                      value={loot.chance} 
                                      onChange={e => updateLootRow(idx, 'chance', e.target.value)}
                                      className="bg-dark-800 border border-dark-600 rounded px-2 py-1 text-[10px] text-white w-full"
                                      placeholder="Chance"
                                  />
                              </div>
                              <button onClick={() => removeLootRow(idx)} className="text-rose-500 hover:text-white p-1">
                                  <Trash2 size={14} />
                              </button>
                          </div>
                      ))}
                      {formData.lootTable?.length === 0 && <p className="text-center py-4 text-[10px] text-gray-600 italic">No loot defined for this beast</p>}
                  </div>
              </div>

              <button className="btn-primary w-full py-3" onClick={handleSave}>Confirm Blueprint</button>
          </div>
      </Modal>

      {/* Item Selection Modal */}
      <Modal isOpen={isItemSelectorOpen} onClose={() => setIsItemSelectorOpen(false)} title="Select Loot Item">
          <div className="space-y-4">
              <div className="flex gap-2">
                  <input
                      type="text"
                      placeholder="Search items..."
                      className="input-field flex-1 py-2"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                  />
                  <select
                      className="input-field py-2 bg-dark-800 text-white"
                      value={itemTypeFilter}
                      onChange={(e) => setItemTypeFilter(e.target.value)}
                  >
                      <option value="">All Types</option>
                      <option value="EQUIPMENT">Equipment</option>
                      <option value="CONSUMABLE">Consumable</option>
                      <option value="MATERIAL">Material</option>
                  </select>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1 border border-dark-700 rounded-xl p-1 bg-dark-900">
                  {items
                      .filter(i => itemTypeFilter ? i.type === itemTypeFilter : true)
                      .filter(i => 
                          i.name.toLowerCase().includes(itemSearch.toLowerCase()) || 
                          i.code.toLowerCase().includes(itemSearch.toLowerCase())
                      )
                      .map(item => (
                          <button
                              key={item.code}
                              onClick={() => {
                                  if (activeLootIndex !== null) {
                                      updateLootRow(activeLootIndex, 'itemCode', item.code);
                                  }
                                  setIsItemSelectorOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-dark-800 rounded-lg flex items-center justify-between group transition-colors"
                          >
                              <div className="flex items-center gap-3">
                                  <span className="text-lg">{item.emoji}</span>
                                  <div>
                                      <p className="text-white text-sm font-bold group-hover:text-accent transition-colors">{item.name}</p>
                                      <p className="text-[10px] text-gray-500 font-mono">{item.code}</p>
                                  </div>
                              </div>
                              <span 
                                  className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter" 
                                  style={{ color: item.rarity?.color, backgroundColor: `${item.rarity?.color}20`, border: `1px solid ${item.rarity?.color}30` }}
                              >
                                  {item.rarityId}
                              </span>
                          </button>
                      ))
                  }
                  {items.filter(i => itemTypeFilter ? i.type === itemTypeFilter : true).filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.code.toLowerCase().includes(itemSearch.toLowerCase())).length === 0 && (
                      <p className="text-center py-4 text-[10px] text-gray-500 uppercase tracking-widest font-black">No items found</p>
                  )}
              </div>
          </div>
      </Modal>
    </div>
  )
}

function Marketplace() {
  const [listings, setListings] = useState<MarketListing[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMarket = async () => {
    try {
        const res = await adminApi.getMarket()
        setListings(res.data)
        setLoading(false)
    } catch {
        setLoading(false)
    }
  }

  useEffect(() => { 
    const timer = setTimeout(fetchMarket, 0)
    return () => clearTimeout(timer)
  }, [])

  const handleRemove = async (id: string) => {
      if (confirm('Forcibly remove this listing? Item will be lost.')) {
          await adminApi.deleteListing(id)
          fetchMarket()
      }
  }

  if (loading) return null

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Market Moderator</h1>
        
        <div className="card border-none shadow-2xl">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-dark-900 text-gray-500 text-[10px] uppercase font-black tracking-widest border-b border-dark-700">
                        <th className="px-6 py-4">Seller</th>
                        <th className="px-6 py-4">Item</th>
                        <th className="px-6 py-4">Qty</th>
                        <th className="px-6 py-4">Asking Price</th>
                        <th className="px-6 py-4">Stats</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                    {listings.map((l: MarketListing) => (
                        <tr key={l.id} className="hover:bg-dark-700/20">
                            <td className="px-6 py-4 font-bold text-white text-sm">{l.seller.name}</td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{l.template.emoji}</span>
                                    <span className="text-gray-300 text-xs">{l.template.name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-gray-400 text-sm">x{l.quantity}</td>
                            <td className="px-6 py-4">
                                <span className="text-amber-500 font-bold text-sm">{l.price.toLocaleString()} G</span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1.5">
                                    {l.rolledAtk ? <span className="text-[9px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20 whitespace-nowrap">⚔️ {l.rolledAtk}</span> : null}
                                    {l.rolledDef ? <span className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 whitespace-nowrap">🛡️ {l.rolledDef}</span> : null}
                                    {l.rolledStr ? <span className="text-[9px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded border border-orange-500/20 whitespace-nowrap">💪 {l.rolledStr}</span> : null}
                                    {l.rolledAgi ? <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">💨 {l.rolledAgi}</span> : null}
                                    {l.rolledInt ? <span className="text-[9px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20 whitespace-nowrap">🧠 {l.rolledInt}</span> : null}
                                    {l.rolledLuk ? <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 whitespace-nowrap">🍀 {l.rolledLuk}</span> : null}
                                    {!l.rolledAtk && !l.rolledDef && !l.rolledStr && !l.rolledAgi && !l.rolledInt && !l.rolledLuk && <span className="text-gray-600">-</span>}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button onClick={() => handleRemove(l.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {listings.length === 0 && <p className="text-center py-20 text-gray-600 uppercase text-xs tracking-widest font-black">Market is currently empty</p>}
        </div>
    </div>
  )
}

function Dungeons() {
    const [dungeons, setDungeons] = useState<DungeonTemplate[]>([])
    const [monsters, setMonsters] = useState<MonsterTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editDungeon, setEditDungeon] = useState<DungeonTemplate | null>(null)
    const [formData, setFormData] = useState<Partial<DungeonTemplate>>({
        name: '', description: '', minDepth: 0, maxDepth: undefined, minLevel: 1, floorCount: 3,
        lootMultiplier: 1.0, expMultiplier: 1.0, treasureChance: 0.3, sprites: { background: '' }
    })

    const fetchData = async () => {
        try {
            const [dRes, mRes] = await Promise.all([
                adminApi.getDungeons(),
                adminApi.getMonsters()
            ]);
            setDungeons(dRes.data)
            setMonsters(mRes.data)
            setLoading(false)
        } catch {
            setLoading(false)
        }
    }

    useEffect(() => {
        const timer = setTimeout(fetchData, 0)
        return () => clearTimeout(timer)
    }, [])

    const handleSave = async () => {
        try {
            if (editDungeon) {
                await adminApi.updateDungeon(editDungeon.id, formData)
            } else {
                await adminApi.createDungeon(formData)
            }
            setIsModalOpen(false)
            fetchData()
            alert('Dungeon blueprint saved!')
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            alert('Failed to save dungeon: ' + message)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm("Forcibly dismantle this dungeon?")) {
            await adminApi.deleteDungeon(id)
            fetchData()
        }
    }

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div></div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Dungeon Architect</h1>
                <button onClick={() => {
                    setEditDungeon(null);
                    setFormData({ name: '', description: '', minDepth: 0, maxDepth: undefined, minLevel: 1, floorCount: 3, lootMultiplier: 1.0, expMultiplier: 1.0, treasureChance: 0.3, sprites: { background: '' } });
                    setIsModalOpen(true);
                }} className="btn-primary flex items-center gap-2">
                    <Plus size={18} />
                    Blueprint New Dungeon
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dungeons.map((d: DungeonTemplate) => {
                    const dungeonBoss = monsters.find(m => m.dungeonId === d.id && m.isBoss);
                    return (
                    <div key={d.id} className="card border-l-4 border-l-accent flex gap-6 group relative">
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <button onClick={() => {
                                setEditDungeon(d);
                                setFormData({ ...d, sprites: d.sprites || { background: '' } });
                                setIsModalOpen(true);
                            }} className="p-2 bg-dark-900 rounded-lg text-accent hover:text-white border border-dark-600"><Edit2 size={14} /></button>
                            <button onClick={() => handleDelete(d.id)} className="p-2 bg-dark-900 rounded-lg text-rose-500 hover:text-white border border-dark-600"><Trash2 size={14} /></button>
                        </div>

                        <div className="w-24 h-24 rounded-3xl bg-dark-900 border border-dark-600 flex items-center justify-center text-4xl shadow-inner group-hover:scale-105 transition-transform shrink-0">
                            🏰
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-white mb-1 uppercase tracking-tight truncate">{d.name}</h3>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {dungeonBoss ? (
                                    <span className="text-[8px] uppercase font-black bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">👑 Boss: {dungeonBoss.name}</span>
                                ) : (
                                    <span className="text-[8px] uppercase font-black bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20 animate-pulse">⚠️ No Boss Assigned</span>
                                )}
                            </div>
                            <p className="text-gray-500 text-xs line-clamp-1 mb-4 italic truncate">"{d.description}"</p>
                            
                            <div className="grid grid-cols-3 gap-2">
                                <div className="text-center bg-dark-900 py-2 rounded-xl border border-dark-700">
                                    <p className="text-[8px] text-gray-600 uppercase font-black">Floors</p>
                                    <p className="text-white text-xs font-bold">{d.floorCount}</p>
                                </div>
                                <div className="text-center bg-dark-900 py-2 rounded-xl border border-dark-700">
                                    <p className="text-[8px] text-gray-600 uppercase font-black">Min Lvl</p>
                                    <p className="text-white text-xs font-bold">{d.minLevel}</p>
                                </div>
                                <div className="text-center bg-dark-900 py-2 rounded-xl border border-dark-700">
                                    <p className="text-[8px] text-gray-600 uppercase font-black">Min Depth</p>
                                    <p className="text-white text-xs font-bold">{d.minDepth}km</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    );
                })}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editDungeon ? 'Update Dungeon' : 'New Dungeon Blueprint'}>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Dungeon Name</label>
                        <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field w-full py-2" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Description</label>
                        <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input-field w-full py-2 h-20" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Min Depth</label>
                            <input type="number" value={formData.minDepth} onChange={e => setFormData({...formData, minDepth: parseInt(e.target.value) || 0})} className="input-field w-full py-2" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Min Level</label>
                            <input type="number" value={formData.minLevel} onChange={e => setFormData({...formData, minLevel: parseInt(e.target.value) || 1})} className="input-field w-full py-2" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Floors</label>
                            <input type="number" value={formData.floorCount} onChange={e => setFormData({...formData, floorCount: parseInt(e.target.value) || 1})} className="input-field w-full py-2" />
                        </div>
                    </div>
                    <div className="pt-4 border-t border-dark-700">
                        <label className="text-[10px] font-black text-emerald-500 uppercase">Modifiers</label>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-500 uppercase">Loot Multiplier</label>
                                <input type="number" step="0.1" value={formData.lootMultiplier} onChange={e => setFormData({...formData, lootMultiplier: parseFloat(e.target.value) || 1.0})} className="input-field w-full py-2" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-500 uppercase">EXP Multiplier</label>
                                <input type="number" step="0.1" value={formData.expMultiplier} onChange={e => setFormData({...formData, expMultiplier: parseFloat(e.target.value) || 1.0})} className="input-field w-full py-2" />
                            </div>
                        </div>
                    </div>

                    <div className="p-3 bg-dark-900/50 rounded-xl border border-dark-700 space-y-3">
                        <h4 className="text-[10px] font-black text-accent uppercase tracking-widest">Sprite Assets</h4>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-500 uppercase">Background Sprite URL</label>
                            <input 
                              value={formData.sprites?.background || ''} 
                              onChange={e => setFormData({
                                ...formData, 
                                sprites: { ...(formData.sprites || {}), background: e.target.value }
                              })} 
                              className="input-field w-full py-2 text-xs" 
                              placeholder="Ex: /assets/sprites/dungeons/crypt_bg.png" 
                            />
                        </div>
                    </div>

                    <button className="btn-primary w-full py-3 mt-4" onClick={handleSave}>Finalize Blueprint</button>
                </div>
            </Modal>
        </div>
    )
}

function Config() {
  const [config, setConfig] = useState<WorldConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await adminApi.getConfig()
        setConfig(res.data)
        setLoading(false)
      } catch {
        setLoading(false)
      }
    }
    loadConfig()
  }, [])

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div></div>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">World Parameters</h1>
      <div className="bg-dark-800 border-l-4 border-l-amber-500 p-6 rounded-r-2xl shadow-xl">
          <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">< Megaphone size={24}/></div>
              <div>
                  <h2 className="text-lg font-bold text-white uppercase tracking-tight">Deployment Notice</h2>
                  <p className="text-gray-400 text-sm mt-1 leading-relaxed">
                    Balance parameters are currently served from the static backend constants. 
                    In order to enable <span className="text-accent font-bold italic">Hot-Tweak™</span> functionality, these values must be migrated to the database.
                  </p>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={18} className="text-emerald-500"/>
                <h2 className="text-lg font-bold text-white uppercase">Growth & Rates</h2>
            </div>
            <div className="space-y-4">
                {['ENCOUNTER_INTERVAL', 'SAFE_ZONE_LIMIT', 'TRAVEL_OUT_DISTANCE', 'TRAVEL_IN_DISTANCE'].map(key => (
                    <div key={key} className="flex justify-between items-center bg-dark-900/50 p-3 rounded-xl border border-dark-700">
                        <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{key.replace(/_/g, ' ')}</span>
                        <span className="text-accent font-pixel text-sm">{config?.current[key] || 0}</span>
                    </div>
                ))}
            </div>
        </div>

        <div className="card space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={18} className="text-blue-500"/>
                <h2 className="text-lg font-bold text-white uppercase">Combat Logic</h2>
            </div>
            <div className="space-y-4">
                {['BASE_SPAWN_CHANCE', 'PVP_AMBUSH_CHANCE', 'BASE_CRIT_MODIFIER', 'VICTORY_HEAL_PCT'].map(key => (
                    <div key={key} className="flex justify-between items-center bg-dark-900/50 p-3 rounded-xl border border-dark-700">
                        <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{key.replace(/_/g, ' ')}</span>
                        <span className="text-accent font-pixel text-sm">{((config?.current[key] || 0) * 100).toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>

        <div className="card space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Megaphone size={18} className="text-purple-500"/>
                <h2 className="text-lg font-bold text-white uppercase">Loot Scaling</h2>
            </div>
            <div className="space-y-4">
                {['LOOT_DEPTH_INTERVAL', 'LOOT_CHANCE_GROWTH', 'LOOT_QUANTITY_GROWTH', 'GLOBAL_MYTHICAL_CHANCE'].map(key => (
                    <div key={key} className="flex justify-between items-center bg-dark-900/50 p-3 rounded-xl border border-dark-700">
                        <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{key.replace(/_/g, ' ')}</span>
                        <span className="text-accent font-pixel text-sm">{config?.current[key] || 0}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
      
      <div className="card p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-dark-900 px-6 py-4 border-b border-dark-700 flex items-center justify-between">
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-[4px]">System Schema Dump</h2>
            <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
        </div>
        <pre className="p-8 overflow-auto text-[10px] text-emerald-500 font-mono bg-[#050505] leading-relaxed">
            {JSON.stringify(config?.current, null, 4)}
        </pre>
      </div>
    </div>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const setToken = useAdminStore(state => state.setToken)
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await axios.post('http://localhost:3000/api/auth/login', { email, password })
      if (res.data.isAdmin) {
         setToken(res.data.token)
      } else {
         setError('Admin access denied for this user')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
      <div className="card w-full max-w-md p-8 space-y-8 shadow-2xl border-dark-600 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-accent/20 rounded-full blur-3xl" />
        
        <div className="text-center relative">
          <div className="inline-flex p-5 rounded-[2rem] bg-accent/10 text-accent mb-6 shadow-xl border border-accent/20">
             <ShieldCheck size={48} />
          </div>
          <h2 className="text-3xl font-pixel text-white tracking-[0.2em]">ADMIN PORTAL</h2>
          <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-4">Command Center Authentication</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 relative">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Secure Email</label>
            <input 
              type="email" 
              className="w-full input-field py-4 px-5 text-sm" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@spritehero.online"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Encrypted Password</label>
            <input 
              type="password" 
              className="w-full input-field py-4 px-5 text-sm" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          
          {error && <p className="text-rose-500 text-xs text-center font-bold bg-rose-500/10 py-3 rounded-xl border border-rose-500/20 animate-bounce">{error}</p>}

          <button type="submit" className="w-full btn-primary py-5 text-lg mt-4 shadow-accent/40 shadow-xl active:scale-[0.98] transition-transform">
            Enter Command Center
          </button>
        </form>
      </div>
    </div>
  )
}

function App() {
  const token = useAdminStore(state => state.token)

  if (!token) {
    return <Login />
  }

  return (
    <Router>
      <div className="min-h-screen bg-dark-900">
        <Navbar />
        <Sidebar />
        <main className="pl-64 pt-16 min-h-screen">
          <div className="p-8 max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/recipes" element={<Recipes />} />
              <Route path="/nodes" element={<Nodes />} />
              <Route path="/players" element={<Players />} />
              <Route path="/monsters" element={<Monsters />} />
              <Route path="/dungeons" element={<Dungeons />} />
              <Route path="/zones" element={<Zones />} />
              <Route path="/market" element={<Marketplace />} />
              <Route path="/config" element={<Config />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  )
}
function Zones() {
    const [zones, setZones] = useState<Zone[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editZone, setEditZone] = useState<Zone | null>(null)
    const [formData, setFormData] = useState<Partial<Zone>>({
        name: '', minDepth: 0, maxDepth: null, dangerMultiplier: 1, expMultiplier: 1, dropChanceMultiplier: 1,
        commonNodeTypes: [], excludedNodeTypes: [], sprites: { background: '' }
    })

    const fetchZones = async () => {
        try {
            const res = await adminApi.getZones()
            setZones(res.data)
            setLoading(false)
        } catch {
            setLoading(false)
        }
    }

    useEffect(() => { 
        const timer = setTimeout(fetchZones, 0)
        return () => clearTimeout(timer)
    }, [])

    const handleSave = async () => {
        try {
            if (editZone) {
                await adminApi.updateZone(editZone.id, formData)
            } else {
                await adminApi.createZone(formData)
            }
            setIsModalOpen(false)
            fetchZones()
            alert('Zone saved successfully!')
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            alert('Failed: ' + message)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm('Delete this zone?')) {
            try {
                await adminApi.deleteZone(id)
                fetchZones()
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                alert('Failed: ' + message)
            }
        }
    }

    const toggleType = (list: 'common' | 'excluded', type: string) => {
        const key = list === 'common' ? 'commonNodeTypes' : 'excludedNodeTypes'
        const current = (formData[key] || []) as string[]
        const next = current.includes(type) ? current.filter(t => t !== type) : [...current, type]
        setFormData({ ...formData, [key]: next })
    }

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div></div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white tracking-tight">World Zones</h1>
                <button onClick={() => {
                    setEditZone(null)
                    setFormData({ name: '', minDepth: 0, maxDepth: null, dangerMultiplier: 1, expMultiplier: 1, dropChanceMultiplier: 1, commonNodeTypes: [], excludedNodeTypes: [], sprites: { background: '' } })
                    setIsModalOpen(true)
                }} className="btn-primary flex items-center gap-2">
                    <Plus size={18} /> Add Zone
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {zones.map(zone => (
                    <div key={zone.id} className="card border-t-4 border-t-accent group relative">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => {
                                setEditZone(zone)
                                setFormData({ ...zone, sprites: zone.sprites || { background: '' } })
                                setIsModalOpen(true)
                            }} className="p-2 bg-dark-900 rounded-lg text-accent hover:text-white border border-dark-600"><Edit2 size={14}/></button>
                            <button onClick={() => handleDelete(zone.id)} className="p-2 bg-dark-900 rounded-lg text-rose-500 hover:text-white border border-dark-600"><Trash2 size={14}/></button>
                        </div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight mb-1">{zone.name}</h3>
                        <p className="text-xs text-gray-500 font-mono mb-4">{zone.minDepth}km - {zone.maxDepth || '∞'}km</p>
                        
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="bg-dark-900 p-2 rounded-lg border border-dark-700 text-center">
                                <p className="text-[8px] text-gray-500 uppercase font-black">Danger</p>
                                <p className="text-white text-xs font-bold">{zone.dangerMultiplier}x</p>
                            </div>
                            <div className="bg-dark-900 p-2 rounded-lg border border-dark-700 text-center">
                                <p className="text-[8px] text-gray-500 uppercase font-black">EXP</p>
                                <p className="text-emerald-400 text-xs font-bold">{zone.expMultiplier}x</p>
                            </div>
                            <div className="bg-dark-900 p-2 rounded-lg border border-dark-700 text-center">
                                <p className="text-[8px] text-gray-500 uppercase font-black">Loot</p>
                                <p className="text-amber-400 text-xs font-bold">{zone.dropChanceMultiplier}x</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Common Nodes</p>
                                <div className="flex flex-wrap gap-1">
                                    {zone.commonNodeTypes.map((t: string) => <span key={t} className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">{t}</span>)}
                                    {zone.commonNodeTypes.length === 0 && <span className="text-[9px] text-gray-600 italic">None</span>}
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Excluded Nodes</p>
                                <div className="flex flex-wrap gap-1">
                                    {zone.excludedNodeTypes.map((t: string) => <span key={t} className="text-[9px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20">{t}</span>)}
                                    {zone.excludedNodeTypes.length === 0 && <span className="text-[9px] text-gray-600 italic">None</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editZone ? 'Edit Zone' : 'Create Zone'}>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Zone Name</label>
                        <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field w-full py-2" placeholder="Ex: The Outside Skirt" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Min Depth (km)</label>
                            <input type="number" value={formData.minDepth} onChange={e => setFormData({...formData, minDepth: parseInt(e.target.value) || 0})} className="input-field w-full py-2" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Max Depth (km)</label>
                            <input type="number" value={formData.maxDepth || ''} onChange={e => setFormData({...formData, maxDepth: parseInt(e.target.value) || null})} className="input-field w-full py-2" placeholder="Infinite" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Danger Mult</label>
                            <input type="number" step="0.1" value={formData.dangerMultiplier} onChange={e => setFormData({...formData, dangerMultiplier: parseFloat(e.target.value) || 1})} className="input-field w-full py-2" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">EXP Mult</label>
                            <input type="number" step="0.1" value={formData.expMultiplier} onChange={e => setFormData({...formData, expMultiplier: parseFloat(e.target.value) || 1})} className="input-field w-full py-2" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Loot Mult</label>
                            <input type="number" step="0.1" value={formData.dropChanceMultiplier} onChange={e => setFormData({...formData, dropChanceMultiplier: parseFloat(e.target.value) || 1})} className="input-field w-full py-2" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Node Management</label>
                        <div className="space-y-2">
                            {['Mining', 'Woodcutting', 'Harvesting', 'Fishing'].map(type => (
                                <div key={type} className="flex items-center justify-between bg-dark-900 p-2 rounded-xl border border-dark-700">
                                    <span className="text-xs text-white font-bold">{type}</span>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => toggleType('common', type)}
                                            className={cn("text-[9px] px-2 py-1 rounded font-bold uppercase transition-colors", 
                                                formData.commonNodeTypes?.includes(type) ? "bg-emerald-500 text-white" : "bg-dark-700 text-gray-500 hover:bg-dark-600")}
                                        >Common</button>
                                        <button 
                                            onClick={() => toggleType('excluded', type)}
                                            className={cn("text-[9px] px-2 py-1 rounded font-bold uppercase transition-colors", 
                                                formData.excludedNodeTypes?.includes(type) ? "bg-rose-500 text-white" : "bg-dark-700 text-gray-500 hover:bg-dark-600")}
                                        >Exclude</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-3 bg-dark-900/50 rounded-xl border border-dark-700 space-y-3">
                        <h4 className="text-[10px] font-black text-accent uppercase tracking-widest">Sprite Assets</h4>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-500 uppercase">Background Sprite URL</label>
                            <input 
                              value={formData.sprites?.background || ''} 
                              onChange={e => setFormData({
                                ...formData, 
                                sprites: { ...(formData.sprites || {}), background: e.target.value }
                              })} 
                              className="input-field w-full py-2 text-xs" 
                              placeholder="Ex: /assets/sprites/zones/forest_bg.png" 
                            />
                        </div>
                    </div>

                    <button className="btn-primary w-full py-3" onClick={handleSave}>Save Zone</button>
                </div>
            </Modal>
        </div>
    )
}

function Reports() {
  const [reports, setReports] = useState<UserReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  const loadReports = async () => {
    try {
      const res = await adminApi.getReports()
      setReports(res.data)
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReports();
    }, 0);
    return () => clearTimeout(timer);
  }, [])

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await adminApi.updateReportStatus(id, status)
      await loadReports()
    } catch {
      alert("Failed to update status")
    }
  }

  const filteredReports = reports.filter(r => {
    const matchCat = filterCategory === 'ALL' || r.category === filterCategory
    const matchStat = filterStatus === 'ALL' || r.status === filterStatus
    return matchCat && matchStat
  })

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Signals & Feedback</h1>
          <p className="text-gray-400 text-sm mt-1">Review bug reports and player logs submitted from the mobile clients.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-dark-800 border border-dark-700 text-white text-xs px-3 py-2 rounded-xl focus:border-accent outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="BUG">Bugs</option>
            <option value="PLAYER">Player Conduct</option>
          </select>

          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-dark-800 border border-dark-700 text-white text-xs px-3 py-2 rounded-xl focus:border-accent outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <div className="card text-center py-16 text-gray-500 text-sm">
          No signals matching the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredReports.map(report => (
            <div key={report.id} className="card relative border-t-4 border-t-dark-600 flex flex-col justify-between" style={{
              borderTopColor: report.category === "BUG" ? "#f59e0b" : "#f43f5e"
            }}>
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[10px] font-pixel-bold uppercase tracking-widest px-2.5 py-1 rounded border ${
                    report.category === "BUG" 
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-500" 
                      : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                  }`}>
                    {report.category === "BUG" ? "🐞 Bug Report" : "👤 Player Conduct"}
                  </span>
                  
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    report.status === "PENDING" ? "bg-red-900/40 text-red-400 border border-red-500/25" :
                    report.status === "INVESTIGATING" ? "bg-blue-900/40 text-blue-400 border border-blue-500/25" :
                    "bg-emerald-900/40 text-emerald-400 border border-emerald-500/25"
                  }`}>
                    {report.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Reporter:</span>
                    <span className="text-white font-bold">{report.reporterName}</span>
                  </div>
                  {report.category === "PLAYER" && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Reported:</span>
                      <span className="text-rose-400 font-bold">{report.reportedName || "Unknown"}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Received:</span>
                    <span className="text-gray-400">{new Date(report.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-dark-900/50 border border-dark-700 p-4 rounded-xl mb-4 min-h-[80px]">
                  <p className="text-gray-300 text-xs font-sans whitespace-pre-wrap leading-relaxed">
                    {report.description}
                  </p>
                </div>
              </div>

              {/* Status Update Options */}
              <div className="flex gap-2 pt-2 border-t border-dark-700">
                {report.status !== "INVESTIGATING" && report.status !== "RESOLVED" && (
                  <button 
                    onClick={() => handleUpdateStatus(report.id, "INVESTIGATING")}
                    className="flex-1 py-2 text-[10px] font-bold text-center text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl transition-all uppercase tracking-wider"
                  >
                    Investigate
                  </button>
                )}
                {report.status !== "RESOLVED" && (
                  <button 
                    onClick={() => handleUpdateStatus(report.id, "RESOLVED")}
                    className="flex-1 py-2 text-[10px] font-bold text-center text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-all uppercase tracking-wider"
                  >
                    Resolve
                  </button>
                )}
                {report.status === "RESOLVED" && (
                  <button 
                    onClick={() => handleUpdateStatus(report.id, "PENDING")}
                    className="flex-1 py-2 text-[10px] font-bold text-center text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all uppercase tracking-wider"
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
