import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, X, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Customer {
    id?: string;
    name: string;
    contact_person?: string;
    email?: string;
    region?: string;
    tier: string;
    industry?: string;
    csm?: string;
    status: string;
    managed_services?: boolean;
}

interface Feature {
    id: string;
    name: string;
}

interface CustomerFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer?: Customer | null;
    onSuccess?: () => void;
}

export function CustomerFormDialog({ open, onOpenChange, customer, onSuccess }: CustomerFormDialogProps) {
    const [loading, setLoading] = useState(false);
    const [features, setFeatures] = useState<Feature[]>([]);
    const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
    const [formData, setFormData] = useState<Customer>({
        name: '',
        contact_person: '',
        email: '',
        region: '',
        tier: 'Tier 1',
        industry: '',
        csm: '',
        status: 'Active',
        managed_services: false
    });

    useEffect(() => {
        if (open) {
            fetchFeatures();
            if (customer) {
                setFormData(customer);
                fetchCustomerFeatures(customer.id!);
            } else {
                // Reset form for new customer
                setFormData({
                    name: '',
                    contact_person: '',
                    email: '',
                    region: '',
                    tier: 'Tier 1',
                    industry: '',
                    csm: '',
                    status: 'Active',
                    managed_services: false
                });
                setSelectedFeatures([]);
            }
        }
    }, [open, customer]);

    const fetchFeatures = async () => {
        const { data, error } = await supabase
            .from('features')
            .select('id, name')
            .order('name');

        if (!error && data) {
            setFeatures(data);
        }
    };

    const fetchCustomerFeatures = async (customerId: string) => {
        const { data, error } = await supabase
            .from('customer_features')
            .select('feature_id')
            .eq('customer_id', customerId);

        if (!error && data) {
            setSelectedFeatures(data.map(cf => cf.feature_id));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let customerId: string;

            if (customer?.id) {
                // Update existing customer
                const { error } = await supabase
                    .from('customers')
                    .update(formData)
                    .eq('id', customer.id);

                if (error) throw error;
                customerId = customer.id;
                toast.success('Customer updated successfully');
            } else {
                // Create new customer
                const { data, error } = await supabase
                    .from('customers')
                    .insert([formData])
                    .select('id')
                    .single();

                if (error) throw error;
                customerId = data.id;
                toast.success('Customer created successfully');
            }

            // Update feature mappings
            await updateFeatureMappings(customerId);

            onSuccess?.();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Error saving customer:', error);
            toast.error(error.message || 'Failed to save customer');
        } finally {
            setLoading(false);
        }
    };

    const updateFeatureMappings = async (customerId: string) => {
        // Delete existing mappings
        await supabase
            .from('customer_features')
            .delete()
            .eq('customer_id', customerId);

        // Insert new mappings
        if (selectedFeatures.length > 0) {
            const mappings = selectedFeatures.map(featureId => ({
                customer_id: customerId,
                feature_id: featureId
            }));

            const { error } = await supabase
                .from('customer_features')
                .insert(mappings);

            if (error) {
                console.error('Error updating feature mappings:', error);
                toast.error('Failed to update feature mappings');
            }
        }
    };

    const toggleFeature = (featureId: string) => {
        setSelectedFeatures(prev =>
            prev.includes(featureId)
                ? prev.filter(id => id !== featureId)
                : [...prev, featureId]
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>{customer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
                    <DialogDescription>
                        {customer ? 'Update customer information and feature mappings' : 'Create a new customer and assign features'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-4 pb-4">
                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Company Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Contact Person & Email */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="contact_person">Contact Person</Label>
                                    <Input
                                        id="contact_person"
                                        value={formData.contact_person}
                                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Region & Industry */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="region">Region</Label>
                                    <Input
                                        id="region"
                                        value={formData.region}
                                        onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="industry">Industry</Label>
                                    <Input
                                        id="industry"
                                        value={formData.industry}
                                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Tier & Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="tier">Tier *</Label>
                                    <Select value={formData.tier} onValueChange={(value) => setFormData({ ...formData, tier: value })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Tier 1">Tier 1</SelectItem>
                                            <SelectItem value="Tier 2">Tier 2</SelectItem>
                                            <SelectItem value="Tier 3">Tier 3</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status *</Label>
                                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Active">Active</SelectItem>
                                            <SelectItem value="Inactive">Inactive</SelectItem>
                                            <SelectItem value="Prospect">Prospect</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* CSM */}
                            <div className="space-y-2">
                                <Label htmlFor="csm">Customer Success Manager</Label>
                                <Input
                                    id="csm"
                                    value={formData.csm}
                                    onChange={(e) => setFormData({ ...formData, csm: e.target.value })}
                                />
                            </div>

                            {/* Features */}
                            <div className="space-y-2">
                                <Label>Features</Label>
                                <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                                    {features.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No features available</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {features.map(feature => (
                                                <Badge
                                                    key={feature.id}
                                                    variant={selectedFeatures.includes(feature.id) ? 'default' : 'outline'}
                                                    className="cursor-pointer"
                                                    onClick={() => toggleFeature(feature.id)}
                                                >
                                                    {feature.name}
                                                    {selectedFeatures.includes(feature.id) && (
                                                        <X className="h-3 w-3 ml-1" />
                                                    )}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">Click to select/deselect features</p>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {customer ? 'Update Customer' : 'Create Customer'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
