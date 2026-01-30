import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, X, Upload, Image } from 'lucide-react';
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
    logo_url?: string;
    deployment_type?: string;
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
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [formData, setFormData] = useState<Customer>({
        name: '',
        contact_person: '',
        email: '',
        region: '',
        tier: 'Tier 1',
        industry: '',
        csm: '',
        status: 'Active',
        managed_services: false,
        logo_url: '',
        deployment_type: ''
    });

    useEffect(() => {
        if (open) {
            fetchFeatures();
            if (customer) {
                setFormData({
                    ...customer,
                    logo_url: customer.logo_url || '',
                    deployment_type: customer.deployment_type || ''
                });
                fetchCustomerFeatures(customer.id!);
                setLogoPreview(customer.logo_url || null);
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
                    managed_services: false,
                    logo_url: '',
                    deployment_type: ''
                });
                setSelectedFeatures([]);
                setLogoFile(null);
                setLogoPreview(null);
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

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadLogo = async (customerId: string): Promise<string | null> => {
        if (!logoFile) return formData.logo_url || null;

        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${customerId}-logo.${fileExt}`;
        const filePath = `customer-logos/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
            .from('evidence-files')
            .upload(filePath, logoFile, { upsert: true });

        if (uploadError) {
            console.error('Error uploading logo:', uploadError);
            toast.error('Failed to upload logo');
            return formData.logo_url || null;
        }

        // Get public URL
        const { data } = supabase.storage
            .from('evidence-files')
            .getPublicUrl(filePath);

        return data.publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let customerId: string;
            const submitData = {
                name: formData.name,
                contact_person: formData.contact_person,
                email: formData.email,
                region: formData.region,
                tier: formData.tier,
                industry: formData.industry,
                status: formData.status,
                managed_services: formData.managed_services,
                logo_url: formData.logo_url || null,
                deployment_type: formData.deployment_type || null
            };

            if (customer?.id) {
                // Update existing customer
                const { error } = await supabase
                    .from('customers')
                    .update(submitData)
                    .eq('id', customer.id);

                if (error) throw error;
                customerId = customer.id;

                // Upload logo if changed
                if (logoFile) {
                    const logoUrl = await uploadLogo(customerId);
                    if (logoUrl) {
                        await supabase
                            .from('customers')
                            .update({ logo_url: logoUrl })
                            .eq('id', customerId);
                    }
                }

                toast.success('Customer updated successfully');
            } else {
                // Create new customer
                const { data, error } = await supabase
                    .from('customers')
                    .insert([submitData])
                    .select('id')
                    .single();

                if (error) throw error;
                customerId = data.id;

                // Upload logo if provided
                if (logoFile) {
                    const logoUrl = await uploadLogo(customerId);
                    if (logoUrl) {
                        await supabase
                            .from('customers')
                            .update({ logo_url: logoUrl })
                            .eq('id', customerId);
                    }
                }

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
                            {/* Logo Upload */}
                            <div className="space-y-2">
                                <Label>Company Logo</Label>
                                <div className="flex items-center gap-4">
                                    {logoPreview ? (
                                        <div className="relative">
                                            <img
                                                src={logoPreview}
                                                alt="Logo preview"
                                                className="h-16 w-16 rounded-lg object-cover border"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground"
                                                onClick={() => {
                                                    setLogoFile(null);
                                                    setLogoPreview(null);
                                                    setFormData({ ...formData, logo_url: '' });
                                                }}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                                            <Image className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div>
                                        <Label
                                            htmlFor="logo-upload"
                                            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors"
                                        >
                                            <Upload className="h-4 w-4" />
                                            {logoPreview ? 'Change Logo' : 'Upload Logo'}
                                        </Label>
                                        <input
                                            id="logo-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoChange}
                                            className="hidden"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                                    </div>
                                </div>
                            </div>

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

                            {/* Deployment Type */}
                            <div className="space-y-2">
                                <Label htmlFor="deployment_type">Deployment Type</Label>
                                <Select 
                                    value={formData.deployment_type || 'none'} 
                                    onValueChange={(value) => setFormData({ ...formData, deployment_type: value === 'none' ? '' : value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select deployment type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Not specified</SelectItem>
                                        <SelectItem value="Cloud">Cloud</SelectItem>
                                        <SelectItem value="On Prem">On Prem</SelectItem>
                                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                                    </SelectContent>
                                </Select>
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