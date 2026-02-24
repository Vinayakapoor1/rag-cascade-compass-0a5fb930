import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Customer {
  id: string;
  name: string;
  tier: string;
  region: string | null;
  industry: string | null;
  status: string;
  contact_person: string | null;
  email: string | null;
  managed_services: boolean | null;
}

export function CustomersOverviewTab() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, search, tierFilter, regionFilter]);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, tier, region, industry, status, contact_person, email, managed_services')
      .order('name');

    if (!error && data) {
      setCustomers(data);
    }
    setLoading(false);
  };

  const filterCustomers = () => {
    let filtered = [...customers];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        c.contact_person?.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower)
      );
    }

    if (tierFilter !== 'all') {
      filtered = filtered.filter(c => c.tier === tierFilter);
    }

    if (regionFilter !== 'all') {
      filtered = filtered.filter(c => c.region === regionFilter);
    }

    setFilteredCustomers(filtered);
  };

  const uniqueRegions = [...new Set(customers.map(c => c.region).filter(Boolean))] as string[];
  const uniqueTiers = [...new Set(customers.map(c => c.tier))];
  const withManagedServices = customers.filter(c => c.managed_services === true).length;
  const withoutManagedServices = customers.filter(c => !c.managed_services).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customers ({filteredCustomers.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search customers..." 
                className="pl-9 w-48"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                {uniqueTiers.map(tier => (
                  <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {uniqueRegions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="gap-1.5 py-1 px-3">
            <span className="font-semibold">{withManagedServices}</span> Managed Services
          </Badge>
          <Badge variant="secondary" className="gap-1.5 py-1 px-3">
            <span className="font-semibold">{withoutManagedServices}</span> Without Managed Services
          </Badge>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.slice(0, 50).map(customer => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      {customer.contact_person && (
                        <p className="text-xs text-muted-foreground">{customer.contact_person}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.tier === 'Tier1' ? 'default' : 'secondary'}>
                      {customer.tier}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{customer.region || '-'}</TableCell>
                  <TableCell className="text-sm">{customer.industry || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={customer.status === 'Active' ? 'outline' : 'secondary'}>
                      {customer.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCustomers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No customers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {filteredCustomers.length > 50 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Showing first 50 of {filteredCustomers.length} customers
          </p>
        )}
      </CardContent>
    </Card>
  );
}
