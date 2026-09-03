const fs = require('fs');
const path = 'pages/AdminUserDesigner.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /                                                    <\/label>\r?\n                                                    <input\r?\n                                                        type="text"\r?\n                                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-frost-500 outline-none font-mono text-sm"\r?\n                                                        placeholder="Leave blank to use the same as Read Variable"\r?\n                                                        value=\{\(widgetForm\.config as any\)\?\.readVariableName \|\| ''\}\r?\n                                                        onChange=\{e => setWidgetForm\(\{ \.\.\.widgetForm, config: \{ \.\.\.widgetForm\.config, readVariableName: e\.target\.value \} \}\)\}\r?\n                                                    \/>\r?\n                                                <\/div>\r?\n                                            <\/div>\r?\n                                        <\/div>\r?\n                                    \)\}/;

const replacement = `                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-frost-500 outline-none font-mono text-sm"
                                                        placeholder="Leave blank to use the same as Read Variable"
                                                        value={(widgetForm.config as any)?.readVariableName || ''}
                                                        onChange={e => setWidgetForm({ ...widgetForm, config: { ...widgetForm.config, readVariableName: e.target.value } })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                                                        Read QoS
                                                        <InfoTooltip title="Read Quality of Service" content="QoS for the read subscription." />
                                                    </label>
                                                    <select
                                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none text-sm"
                                                        value={(widgetForm.config as any)?.readQos || 0}
                                                        onChange={e => setWidgetForm({ ...widgetForm, config: { ...widgetForm.config, readQos: parseInt(e.target.value) } })}
                                                    >
                                                        <option value={0}>0 - At most once</option>
                                                        <option value={1}>1 - At least once</option>
                                                        <option value={2}>2 - Exactly once</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}`;

content = content.replace(regex, replacement);

// I also want to rename the label of the main QoS field to "Publish QoS (or Main QoS)" to avoid confusion.
content = content.replace(/QoS\r?\n\s*<InfoTooltip title="Quality of Service" content="0: At most once delivery\. 1: At least once\. 2: Exactly once \(Slowest but most reliable\)\." \/>/,
    "Publish / Main QoS\n                                                <InfoTooltip title=\"Quality of Service\" content=\"0: At most once delivery. 1: At least once. 2: Exactly once. Used for Publishing (if control widget) or Main Read (if no separate Read Topic).\" />");

fs.writeFileSync(path, content, 'utf8');
console.log('AdminUserDesigner QoS updated');
