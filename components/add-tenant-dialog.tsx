'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Check } from 'lucide-react';

interface AddTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: TenantFormData) => void;
}

export interface TenantFormData {
  agencyName: string;
  logo: File | null;
  brandColor: string;
}

export function AddTenantDialog({ open, onOpenChange, onSubmit }: AddTenantDialogProps) {
  const [formData, setFormData] = useState<TenantFormData>({
    agencyName: '',
    logo: null,
    brandColor: '#2563eb',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAgencyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, agencyName: e.target.value });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, logo: file });
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, brandColor: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agencyName.trim()) {
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    onSubmit?.(formData);
    setFormData({ agencyName: '', logo: null, brandColor: '#2563eb' });
    setLogoPreview(null);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add New Tenant</DialogTitle>
          <DialogDescription>
            Onboard a new agency to the queue management system
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Agency Name Field */}
          <div className="space-y-2">
            <Label htmlFor="agency-name" className="text-sm font-semibold text-foreground">
              Agency Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="agency-name"
              placeholder="e.g., Dinas Kesehatan Kota"
              value={formData.agencyName}
              onChange={handleAgencyNameChange}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground"
              required
            />
            <p className="text-xs text-muted-foreground">
              The official name of the agency or organization
            </p>
          </div>

          {/* Logo Upload Field */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              Upload Logo <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <div className="relative">
              <input
                id="logo-input"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
              <label
                htmlFor="logo-input"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors duration-200"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {logoPreview ? (
                    <>
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-12 w-12 object-contain mb-2"
                      />
                      <p className="text-xs text-foreground font-semibold">Logo added</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, or GIF</p>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Brand Color Field */}
          <div className="space-y-2">
            <Label htmlFor="brand-color" className="text-sm font-semibold text-foreground">
              Brand Color <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-lg border-2 border-border overflow-hidden">
                <input
                  id="brand-color"
                  type="color"
                  value={formData.brandColor}
                  onChange={handleColorChange}
                  className="w-full h-full cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <Input
                  type="text"
                  value={formData.brandColor}
                  onChange={handleColorChange}
                  className="border-border bg-background text-foreground font-mono text-sm"
                  placeholder="#2563eb"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Primary brand color for the agency portal
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.agencyName.trim() || isSubmitting}
              className="flex-1 gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Add Tenant
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
