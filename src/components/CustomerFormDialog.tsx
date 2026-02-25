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

import { Checkbox } from '@/components/ui/checkbox';

interface Customer {
    id?: string;
    name: string;
    contact_person?: string;
    email?: string;
    region?: string;
    tier: string;
    industry?: string;
    csm_id?: string;
    status: string;
    managed_services?: boolean;
    logo_url?: string;
    deployment_type?: string;
}

interface Feature {
    id: string;
    name: string;
}

interface CSM {
    id: string;
    name: string;
}

interface CustomerFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer?: Customer | null;
    onSuccess?: () => void;
}

const TIER_OPTIONS = ['Tier1', 'Tier2', 'Unassigned'];
const REGION_OPTIONS = ['India', 'Middle East', 'Others'];
const DEPLOYMENT_OPTIONS = ['Cloud', 'On Prem', 'Hybrid', 'India Cloud', 'UAE Cloud', 'Private Cloud'];

export function CustomerFormDialog({ open, onOpenChange, customer, onSuccess }: CustomerFormDialogProps) {
    const [loading, setLoading] = useState(false);
    const [features, setFeatures] = useState<Feature[]>([]);
    const [csms, setCsms] = useState<CSM[]>([]);
    const [industries, setIndustries] = useState<string[]>([]);
    const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [formData, setFormData] = useState<Customer>({
        name: '',
        contact_person: '',
        email: '',
        region: '',
        tier: 'Tier1',
        industry: '',
        csm_id: '',
        status: 'Active',
        managed_services: false,
        logo_url: '',
        deployment_type: ''
    });

    useEffect(() => {
        if (open) {
            fetchFeatures();
            fetchCsms();
            fetchIndustries();
            if (customer?.id) {
                fetchFullCustomer(customer.id);
                fetchCustomerFeatures(customer.id);
            } else {
                setFormData({
                    name: '',
                    contact_person: '',
                    email: '',
                    region: '',
                    tier: 'Tier1',
                    industry: '',
                    csm_id: '',
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

    const fetchFullCustomer = async (id: string) => {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .single();
        if (!error && data) {
            setFormData({
                name: data.name,
                contact_person: data.contact_person || '',
                email: data.email || '',
                region: data.region || '',
                tier: data.tier,
                industry: data.industry || '',
                csm_id: data.csm_id || '',
                status: data.status,
                managed_services: data.managed_services || false,
                logo_url: data.logo_url || '',
                deployment_type: data.deployment_type || '',
            });
            setLogoPreview(data.logo_url || null);
        }
    };

    const fetchFeatures = async () => {
        const { data, error } = await supabase
            .from('features')
            .select('id, name')
            .order('name');
        if (!error && data) setFeatures(data);
    };

    const fetchCsms = async () => {
        const { data, error } = await supabase
            .from('csms')
            .select('id, name')
            .order('name');
        if (!error && data) setCsms(data);
    };

    const fetchIndustries = async () => {
        const { data, error } = await supabase
            .from('industries')
            .select('name')
            .order('name');
        if (!error && data) setIndustries(data.map(i => i.name));
    };

    const fetchCustomerFeatures = async (customerId: string) => {
        const { data, error } = await supabase
            .from('customer_features')
            .select('feature_id')
            .eq('customer_id', customerId);
        if (!error && data) setSelectedFeatures(data.map(cf => cf.feature_id));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const uploadLogo = async (customerId: string): Promise<string | null> => {
        if (!logoFile) return formData.logo_url || null;
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${customerId}-logo.${fileExt}`;
        const filePath = `customer-logos/${fileName}`;
        const { error: uploadError } = await supabase.storage
            .from('evidence-files')
            .upload(filePath, logoFile, { upsert: true });
        if (uploadError) {
            console.error('Error uploading logo:', uploadError);
            toast.error('Failed to upload logo');
            return formData.logo_url || null;
        }
        const { data } = supabase.storage.from('evidence-files').getPublicUrl(filePath);
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
                region: formData.region || null,
                tier: formData.tier,
                industry: formData.industry || null,
                csm_id: formData.csm_id || null,
                status: formData.status,
                managed_services: formData.managed_services,
                logo_url: formData.logo_url || null,
                deployment_type: formData.deployment_type || null
            };

            if (customer?.id) {
                const { error } = await supabase
                    .from('customers')
                    .update(submitData)
                    .eq('id', customer.id);
                if (error) throw error;
                customerId = customer.id;
                if (logoFile) {
                    const logoUrl = await uploadLogo(customerId);
                    if (logoUrl) {
                        await supabase.from('customers').update({ logo_url: logoUrl }).eq('id', customerId);
                    }
                }
                toast.success('Customer updated successfully');
            } else {
                const { data, error } = await supabase
                    .from('customers')
                    .insert([submitData])
                    .select('id')
                    .single();
                if (error) throw error;
                customerId = data.id;
                if (logoFile) {
                    const logoUrl = await uploadLogo(customerId);
                    if (logoUrl) {
                        await supabase.from('customers').update({ logo_url: logoUrl }).eq('id', customerId);
                    }
                }
                toast.success('Customer created successfully');
            }

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
        await supabase.from('customer_features').delete().eq('customer_id', customerId);
        if (selectedFeatures.length > 0) {
            const mappings = selectedFeatures.map(featureId => ({
                customer_id: customerId,
                feature_id: featureId
            }));
            const { error } = await supabase.from('customer_features').insert(mappings);
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
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader className="shrink-0">
                    <DialogTitle>{customer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
                    <DialogDescription>
                        {customer ? 'Update customer information and feature mappings' : 'Create a new customer and assign features'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                        <div className="space-y-4 pb-4">
                            {/* Logo Upload */}
                            <div className="space-y-2">
                                <Label>Company Logo</Label>
                                <div className="flex items-center gap-4">
                                    {logoPreview ? (
                                        <div className="relative">
                                            <img src={logoPreview} alt="Logo preview" className="h-16 w-16 rounded-lg object-cover border" />
                                            <Button
                                                type="button" variant="ghost" size="icon"
                                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground"
                                                onClick={() => { setLogoFile(null); setLogoPreview(null); setFormData({ ...formData, logo_url: '' }); }}
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
                                        <Label htmlFor="logo-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors">
                                            <Upload className="h-4 w-4" />
                                            {logoPreview ? 'Change Logo' : 'Upload Logo'}
                                        </Label>
                                        <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                                    </div>
                                </div>
                            </div>

                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Company Name *</Label>
                                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                            </div>

                            {/* Contact Person & Email */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="contact_person">Contact Person</Label>
                                    <Input id="contact_person" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                            </div>

                            {/* Region & Industry */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Region</Label>
                                    <Select value={formData.region || 'none'} onValueChange={(value) => setFormData({ ...formData, region: value === 'none' ? '' : value })}>
                                        <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Not specified</SelectItem>
                                            {REGION_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Industry</Label>
                                    <Select value={formData.industry || 'none'} onValueChange={(value) => setFormData({ ...formData, industry: value === 'none' ? '' : value })}>
                                        <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Not specified</SelectItem>
                                            {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Tier & Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tier *</Label>
                                    <Select value={formData.tier} onValueChange={(value) => setFormData({ ...formData, tier: value })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {TIER_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Status *</Label>
                                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                                <Label>Deployment Type</Label>
                                <Select value={formData.deployment_type || 'none'} onValueChange={(value) => setFormData({ ...formData, deployment_type: value === 'none' ? '' : value })}>
                                    <SelectTrigger><SelectValue placeholder="Select deployment type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Not specified</SelectItem>
                                        {DEPLOYMENT_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* CSM */}
                            <div className="space-y-2">
                                <Label>Customer Success Manager</Label>
                                <Select value={formData.csm_id || 'none'} onValueChange={(value) => setFormData({ ...formData, csm_id: value === 'none' ? '' : value })}>
                                    <SelectTrigger><SelectValue placeholder="Select CSM" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Not assigned</SelectItem>
                                        {csms.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Managed Services */}
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="managed_services"
                                    checked={formData.managed_services || false}
                                    onCheckedChange={(checked) => setFormData({ ...formData, managed_services: !!checked })}
                                />
                                <Label htmlFor="managed_services" className="cursor-pointer">Managed Services</Label>
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
                                                    {selectedFeatures.includes(feature.id) && <X className="h-3 w-3 ml-1" />}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">Click to select/deselect features</p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-4 shrink-0">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
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
