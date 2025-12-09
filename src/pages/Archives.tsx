import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Archive,
    MessageSquare,
    Image as ImageIcon,
    MonitorPlay,
    Settings as SettingsIcon,
    Trash2,
    Clock,
    Download,
    ExternalLink,
    Search,
} from 'lucide-react';
import { LocalStorageService } from '../services/localStorage';
import type {
    ArchivedItem,
    ArchivedChat,
    ArchivedImage,
    ArchiveSettings
} from '../services/localStorage';
import { Modal } from '../components/Modal/Modal';
import './Archives.css';

type Tab = 'all' | 'chat' | 'image' | 'presentation' | 'settings';

export function Archives() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('all');
    const [items, setItems] = useState<ArchivedItem[]>([]);
    const [settings, setSettings] = useState<ArchiveSettings>(LocalStorageService.getSettings());
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedImage, setSelectedImage] = useState<ArchivedImage | null>(null);

    // Load items on mount and when tab/search changes
    useEffect(() => {
        loadItems();
    }, [activeTab]);

    const loadItems = () => {
        // Run cleanup first to ensure we don't show expired items
        LocalStorageService.runCleanup();

        const allItems = LocalStorageService.getItems();
        let filtered = allItems;

        if (activeTab !== 'all' && activeTab !== 'settings') {
            filtered = allItems.filter(item => item.type === activeTab);
        }

        setItems(filtered);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja excluir este item?')) {
            LocalStorageService.deleteItem(id);
            loadItems();
        }
    };

    const handleOpenChat = (chat: ArchivedChat) => {
        navigate('/chats', { state: { restoredChat: chat } });
    };

    const handleDownloadImage = (image: ArchivedImage, e: React.MouseEvent) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = image.url;
        link.download = `rovena-image-${image.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpdateSettings = (type: keyof ArchiveSettings['retentionDays'], days: number) => {
        const newSettings = {
            ...settings,
            retentionDays: {
                ...settings.retentionDays,
                [type]: days
            }
        };
        setSettings(newSettings);
        LocalStorageService.saveSettings(newSettings);
    };

    const filteredItems = items.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        if (item.title?.toLowerCase().includes(searchLower)) return true;
        if (item.type === 'image' && (item as ArchivedImage).prompt?.toLowerCase().includes(searchLower)) return true;
        return false;
    });

    const renderItemIcon = (type: string) => {
        switch (type) {
            case 'chat': return <MessageSquare size={20} className="item-icon-chat" />;
            case 'image': return <ImageIcon size={20} className="item-icon-image" />;
            case 'presentation': return <MonitorPlay size={20} className="item-icon-pres" />;
            default: return <Archive size={20} />;
        }
    };

    const renderSettings = () => (
        <div className="archives-settings">
            <h2 className="settings-title">Configurações de Retenção</h2>
            <p className="settings-desc">Defina por quanto tempo seus itens arquivados serão mantidos localmente.</p>

            <div className="retention-controls">
                <div className="retention-control">
                    <div className="control-header">
                        <span className="control-label"><MessageSquare size={16} /> Chats</span>
                        <span className="control-value">{settings.retentionDays.chat} dias</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="365"
                        value={settings.retentionDays.chat}
                        onChange={(e) => handleUpdateSettings('chat', parseInt(e.target.value))}
                        className="retention-slider"
                    />
                </div>

                <div className="retention-control">
                    <div className="control-header">
                        <span className="control-label"><ImageIcon size={16} /> Imagens</span>
                        <span className="control-value">{settings.retentionDays.image} dias</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="365"
                        value={settings.retentionDays.image}
                        onChange={(e) => handleUpdateSettings('image', parseInt(e.target.value))}
                        className="retention-slider"
                    />
                </div>

                <div className="retention-control">
                    <div className="control-header">
                        <span className="control-label"><MonitorPlay size={16} /> Apresentações</span>
                        <span className="control-value">{settings.retentionDays.presentation} dias</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="365"
                        value={settings.retentionDays.presentation}
                        onChange={(e) => handleUpdateSettings('presentation', parseInt(e.target.value))}
                        className="retention-slider"
                    />
                </div>
            </div>
            <p className="cleanup-note"><Clock size={14} /> A limpeza automática ocorre sempre que você visita esta página.</p>
        </div>
    );

    return (
        <div className="archives-page page-content">
            <header className="page-header">
                <h1 className="page-title">Arquivos</h1>
                <p className="page-subtitle">Gerencie seu histórico e criações salvas localmente</p>
            </header>

            <div className="archives-controls">
                <div className="archives-tabs">
                    <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Todos</button>
                    <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>Chats</button>
                    <button className={`tab-btn ${activeTab === 'image' ? 'active' : ''}`} onClick={() => setActiveTab('image')}>Imagens</button>
                    <button className={`tab-btn ${activeTab === 'presentation' ? 'active' : ''}`} onClick={() => setActiveTab('presentation')}>Apresentações</button>
                    <button className={`tab-btn settings ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                        <SettingsIcon size={16} /> Configurar
                    </button>
                </div>

                {activeTab !== 'settings' && (
                    <div className="search-bar">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar nos arquivos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}
            </div>

            <div className="archives-content">
                {activeTab === 'settings' ? (
                    renderSettings()
                ) : filteredItems.length === 0 ? (
                    <div className="empty-archives">
                        <Archive size={48} />
                        <h3>Nenhum arquivo encontrado</h3>
                        <p>Seus chats, imagens e apresentações salvos aparecerão aqui.</p>
                    </div>
                ) : (
                    <div className="archives-grid">
                        {filteredItems.map(item => (
                            <div key={item.id} className="archive-card" onClick={() => {
                                if (item.type === 'chat') handleOpenChat(item as ArchivedChat);
                                if (item.type === 'image') setSelectedImage(item as ArchivedImage);
                            }}>
                                <div className="card-header">
                                    <div className="card-type">
                                        {renderItemIcon(item.type)}
                                        <span className="card-date">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <button className="delete-btn" onClick={(e) => handleDelete(item.id, e)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {item.type === 'image' && (
                                    <div className="card-image-preview">
                                        <img src={(item as ArchivedImage).url} alt="Thumbnail" />
                                    </div>
                                )}

                                <div className="card-body">
                                    <h3 className="card-title">
                                        {item.title || (item.type === 'image' ? (item as ArchivedImage).prompt : 'Sem título')}
                                    </h3>
                                    {item.type === 'chat' && (
                                        <p className="card-preview">
                                            {(item as ArchivedChat).messages.length} mensagens
                                        </p>
                                    )}
                                </div>

                                <div className="card-footer">
                                    {item.type === 'chat' && (
                                        <span className="action-link">Abrir Conversa <ExternalLink size={14} /></span>
                                    )}
                                    {item.type === 'image' && (
                                        <button className="download-btn" onClick={(e) => handleDownloadImage(item as ArchivedImage, e)}>
                                            <Download size={14} /> Baixar
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Image Modal */}
            <Modal
                isOpen={!!selectedImage}
                onClose={() => setSelectedImage(null)}
                title="Visualizar Imagem"
                footer={
                    <button className="btn btn-primary" onClick={(e) => selectedImage && handleDownloadImage(selectedImage, e)}>
                        <Download size={16} /> Baixar Imagem
                    </button>
                }
            >
                {selectedImage && (
                    <div className="image-modal-content">
                        <img src={selectedImage.url} alt={selectedImage.prompt} className="full-image" />
                        <p className="image-prompt">{selectedImage.prompt}</p>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default Archives;
