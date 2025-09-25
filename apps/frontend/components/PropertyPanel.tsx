"use client"

import React, { useState, useEffect } from 'react';
import { Shape } from '../draw/Game';

interface PropertyPanelProps {
    selectedShape: Shape | null;
    onPropertyChange: (shapeId: number, properties: {[key: string]: any}) => void;
}

export default function PropertyPanel({ selectedShape, onPropertyChange }: PropertyPanelProps) {
    const [properties, setProperties] = useState<{[key: string]: any}>({});

    useEffect(() => {
        if (selectedShape) {
            setProperties({
                color: selectedShape.color,
                fillColor: (selectedShape as any).fillColor || '',
                strokeWidth: (selectedShape as any).strokeWidth || 1,
                opacity: (selectedShape as any).opacity || 1,
                fontSize: selectedShape.type === 'text' ? (selectedShape as any).fontSize : undefined
            });
        }
    }, [selectedShape]);

    const handlePropertyChange = (key: string, value: any) => {
        if (!selectedShape) return;
        
        const newProperties = { ...properties, [key]: value };
        setProperties(newProperties);
        
        // Only send non-empty values
        const updateProps: {[key: string]: any} = {};
        if (key === 'color' || value) {
            updateProps[key] = value;
        }
        
        onPropertyChange(selectedShape.id, updateProps);
    };

    if (!selectedShape) {
        return (
            <div className="fixed right-[20px] top-[100px] w-[250px] bg-white rounded-lg shadow-lg p-4 z-50">
                <h3 className="text-lg font-semibold mb-3">Properties</h3>
                <p className="text-gray-500 text-sm">Select a shape to edit its properties</p>
            </div>
        );
    }

    const hasStroke = selectedShape.type !== 'text';
    const hasFill = ['rect', 'circle', 'ellipse'].includes(selectedShape.type);
    const hasText = selectedShape.type === 'text';

    return (
        <div className="fixed right-[20px] top-[100px] w-[250px] bg-white rounded-lg shadow-lg p-4 z-50">
            <h3 className="text-lg font-semibold mb-3">Properties</h3>
            <div className="space-y-4">
                {/* Shape Type Display */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                    </label>
                    <div className="text-sm text-gray-600 capitalize">{selectedShape.type}</div>
                </div>

                {/* Stroke Color */}
                {hasStroke && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Stroke Color
                        </label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="color"
                                value={properties.color || '#000000'}
                                onChange={(e) => handlePropertyChange('color', e.target.value)}
                                className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                            />
                            <input
                                type="text"
                                value={properties.color || '#000000'}
                                onChange={(e) => handlePropertyChange('color', e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                placeholder="#000000"
                            />
                        </div>
                    </div>
                )}

                {/* Text Color */}
                {hasText && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Text Color
                        </label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="color"
                                value={properties.color || '#000000'}
                                onChange={(e) => handlePropertyChange('color', e.target.value)}
                                className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                            />
                            <input
                                type="text"
                                value={properties.color || '#000000'}
                                onChange={(e) => handlePropertyChange('color', e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                placeholder="#000000"
                            />
                        </div>
                    </div>
                )}

                {/* Fill Color */}
                {hasFill && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fill Color
                        </label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="color"
                                value={properties.fillColor || '#ffffff'}
                                onChange={(e) => handlePropertyChange('fillColor', e.target.value)}
                                className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                            />
                            <input
                                type="text"
                                value={properties.fillColor || ''}
                                onChange={(e) => handlePropertyChange('fillColor', e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                placeholder="None"
                            />
                            <button
                                onClick={() => handlePropertyChange('fillColor', '')}
                                className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                                title="Remove fill"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                {/* Stroke Width */}
                {hasStroke && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Stroke Width
                        </label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="range"
                                min="1"
                                max="20"
                                value={properties.strokeWidth || 1}
                                onChange={(e) => handlePropertyChange('strokeWidth', parseInt(e.target.value))}
                                className="flex-1"
                            />
                            <span className="text-sm text-gray-600 w-8">{properties.strokeWidth || 1}px</span>
                        </div>
                    </div>
                )}

                {/* Font Size */}
                {hasText && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Font Size
                        </label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="range"
                                min="8"
                                max="72"
                                value={properties.fontSize || 20}
                                onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))}
                                className="flex-1"
                            />
                            <span className="text-sm text-gray-600 w-12">{properties.fontSize || 20}px</span>
                        </div>
                    </div>
                )}

                {/* Opacity */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Opacity
                    </label>
                    <div className="flex items-center space-x-2">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={properties.opacity || 1}
                            onChange={(e) => handlePropertyChange('opacity', parseFloat(e.target.value))}
                            className="flex-1"
                        />
                        <span className="text-sm text-gray-600 w-8">{Math.round((properties.opacity || 1) * 100)}%</span>
                    </div>
                </div>

                {/* Shape ID (for debugging) */}
                <div className="pt-2 border-t border-gray-200">
                    <label className="block text-xs text-gray-500 mb-1">
                        Shape ID
                    </label>
                    <div className="text-xs text-gray-600">{selectedShape.id}</div>
                </div>
            </div>
        </div>
    );
}