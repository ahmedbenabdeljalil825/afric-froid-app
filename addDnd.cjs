const fs = require('fs');
const path = 'pages/AdminUserDesigner.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add State
const stateRegex = /const \[editingWidget, setEditingWidget\] = useState<Widget \| null>\(null\);/;
const stateInjection = `const [editingWidget, setEditingWidget] = useState<Widget | null>(null);\n    const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);`;
content = content.replace(stateRegex, stateInjection);

// Add Handlers
const handlerRegex = /const handleDeleteWidget = async \(widgetId: string\) => \{/;
const handlerInjection = `
    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedWidgetId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedWidgetId || draggedWidgetId === targetId) return;

        const originalWidgets = [...widgets];
        const draggedIndex = widgets.findIndex(w => w.id === draggedWidgetId);
        const targetIndex = widgets.findIndex(w => w.id === targetId);
        
        if (draggedIndex === -1 || targetIndex === -1) return;

        const newWidgets = [...widgets];
        const [removed] = newWidgets.splice(draggedIndex, 1);
        newWidgets.splice(targetIndex, 0, removed);

        const updatedWidgets = newWidgets.map((w, index) => ({
            ...w,
            position: index
        }));

        setWidgets(updatedWidgets);
        setDraggedWidgetId(null);

        try {
            await Promise.all(updatedWidgets.map(w => 
                supabase.from('widgets').update({ position: w.position }).eq('id', w.id)
            ));
            toast('Order saved', 'success');
        } catch (error: any) {
            console.error('Error reordering widgets:', error);
            toast('Failed to save order', 'error');
            setWidgets(originalWidgets);
        }
    };

    const handleDeleteWidget = async (widgetId: string) => {`;
content = content.replace(handlerRegex, handlerInjection);

// Add to UI
const uiRegex = /<div\s*key=\{widget\.id\}\s*className=\{`p-4 rounded-xl border-2 transition-all \$\{widget\.isActive\r?\n\s*\? 'border-frost-200 bg-frost-50\/30'\r?\n\s*: 'border-slate-100 bg-slate-50 opacity-60'\r?\n\s*\}`\}/;
const uiInjection = `<div
                                    key={widget.id}
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(e as any, widget.id)}
                                    onDragOver={(e) => handleDragOver(e as any)}
                                    onDrop={(e) => handleDrop(e as any, widget.id)}
                                    className={\`p-4 rounded-xl border-2 transition-all cursor-move \${
                                        draggedWidgetId === widget.id ? 'opacity-50 scale-95 border-frost-400' : ''
                                    } \${widget.isActive
                                        ? 'border-frost-200 bg-frost-50/30'
                                        : 'border-slate-100 bg-slate-50 opacity-60'
                                        }\`}`;
content = content.replace(uiRegex, uiInjection);

fs.writeFileSync(path, content, 'utf8');
console.log('Drag and Drop added successfully');
