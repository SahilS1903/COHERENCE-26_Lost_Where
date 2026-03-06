import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Key, CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface EmailConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigured?: () => void;
}

export function EmailConfigDialog({ open, onOpenChange, onConfigured }: EmailConfigDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [activeTab, setActiveTab] = useState("gmail");

  const [formData, setFormData] = useState({
    smtpUser: "",
    smtpPassword: "",
    smtpFromName: "",
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpSecure: false,
  });

  // Check if SMTP is already configured
  useEffect(() => {
    if (open) {
      checkExistingConfig();
    }
  }, [open]);

  const checkExistingConfig = async () => {
    try {
      const response: any = await api.user.getSmtpConfig();
      if (response.configured && response.config) {
        setConfigured(true);
        setFormData({
          smtpUser: response.config.smtpUser || "",
          smtpPassword: "", // Don't populate password for security
          smtpFromName: response.config.smtpFromName || "",
          smtpHost: response.config.smtpHost || "smtp.gmail.com",
          smtpPort: response.config.smtpPort || 587,
          smtpSecure: response.config.smtpSecure || false,
        });
      }
    } catch (error) {
      console.error("Failed to fetch SMTP config:", error);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Auto-fill SMTP settings based on provider
    switch (value) {
      case "gmail":
        setFormData((prev) => ({
          ...prev,
          smtpHost: "smtp.gmail.com",
          smtpPort: 587,
          smtpSecure: false,
        }));
        break;
      case "outlook":
        setFormData((prev) => ({
          ...prev,
          smtpHost: "smtp-mail.outlook.com",
          smtpPort: 587,
          smtpSecure: false,
        }));
        break;
      case "custom":
        // Keep existing values
        break;
    }
  };

  const handleSave = async () => {
    if (!formData.smtpUser || !formData.smtpPassword) {
      toast({
        title: "Missing Information",
        description: "Please provide both email and app password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await api.user.updateSmtpConfig(formData);
      setConfigured(true);
      toast({
        title: "✅ Email Configured",
        description: "Your email settings have been saved successfully.",
      });
      onConfigured?.();
    } catch (error: any) {
      toast({
        title: "Configuration Failed",
        description: error.message || "Failed to save email settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!configured && !formData.smtpPassword) {
      toast({
        title: "Save First",
        description: "Please save your email configuration before testing.",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    try {
      // If not saved yet, save first
      if (!configured) {
        await api.user.updateSmtpConfig(formData);
      }
      
      await api.user.testSmtpConfig();
      toast({
        title: "✅ Test Email Sent",
        description: `A test email has been sent to ${formData.smtpUser}. Please check your inbox.`,
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to send test email.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Configure Email Settings
          </DialogTitle>
          <DialogDescription>
            Set up your email account to send automated messages from workflows. We'll use your email credentials to send on your behalf.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gmail">Gmail</TabsTrigger>
            <TabsTrigger value="outlook">Outlook</TabsTrigger>
            <TabsTrigger value="custom">Custom SMTP</TabsTrigger>
          </TabsList>

          <TabsContent value="gmail" className="space-y-4">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">How to generate a Gmail App Password:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Go to your Google Account settings</li>
                    <li>Select <strong>Security</strong> → <strong>2-Step Verification</strong> (enable if not already)</li>
                    <li>Scroll down to <strong>App passwords</strong></li>
                    <li>Click <strong>Select app</strong> → Choose <strong>Mail</strong></li>
                    <li>Click <strong>Select device</strong> → Choose <strong>Other</strong> → Type "Lost_Where"</li>
                    <li>Click <strong>Generate</strong> and copy the 16-character password</li>
                  </ol>
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
                  >
                    Open Google App Passwords <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gmail-email">Gmail Address</Label>
                <Input
                  id="gmail-email"
                  type="email"
                  placeholder="your.email@gmail.com"
                  value={formData.smtpUser}
                  onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gmail-password">App Password (16 characters)</Label>
                <Input
                  id="gmail-password"
                  type="password"
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={formData.smtpPassword}
                  onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value.replace(/\s/g, "") })}
                />
                <p className="text-xs text-muted-foreground">
                  Use an App Password, not your regular Gmail password
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gmail-name">Your Name (optional)</Label>
                <Input
                  id="gmail-name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.smtpFromName}
                  onChange={(e) => setFormData({ ...formData, smtpFromName: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  This name will appear as the sender in emails
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="outlook" className="space-y-4">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">How to use Outlook/Hotmail:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Go to <strong>Microsoft Account Security</strong></li>
                    <li>Select <strong>Advanced security options</strong></li>
                    <li>Under <strong>App passwords</strong>, click <strong>Create a new app password</strong></li>
                    <li>Copy the generated password</li>
                    <li>Use your regular Outlook email and the app password below</li>
                  </ol>
                  <a
                    href="https://account.microsoft.com/security"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
                  >
                    Open Microsoft Security Settings <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="outlook-email">Outlook/Hotmail Address</Label>
                <Input
                  id="outlook-email"
                  type="email"
                  placeholder="your.email@outlook.com"
                  value={formData.smtpUser}
                  onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="outlook-password">App Password</Label>
                <Input
                  id="outlook-password"
                  type="password"
                  placeholder="Enter your app password"
                  value={formData.smtpPassword}
                  onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="outlook-name">Your Name (optional)</Label>
                <Input
                  id="outlook-name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.smtpFromName}
                  onChange={(e) => setFormData({ ...formData, smtpFromName: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Enter your custom SMTP server details. Contact your email provider if you don't know these settings.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="custom-host">SMTP Host</Label>
                <Input
                  id="custom-host"
                  placeholder="smtp.example.com"
                  value={formData.smtpHost}
                  onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-port">SMTP Port</Label>
                <Input
                  id="custom-port"
                  type="number"
                  placeholder="587"
                  value={formData.smtpPort}
                  onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) || 587 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-email">Email Address</Label>
              <Input
                id="custom-email"
                type="email"
                placeholder="your@email.com"
                value={formData.smtpUser}
                onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-password">Password</Label>
              <Input
                id="custom-password"
                type="password"
                placeholder="Your email password"
                value={formData.smtpPassword}
                onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-name">From Name (optional)</Label>
              <Input
                id="custom-name"
                type="text"
                placeholder="John Doe"
                value={formData.smtpFromName}
                onChange={(e) => setFormData({ ...formData, smtpFromName: e.target.value })}
              />
            </div>
          </TabsContent>
        </Tabs>

        {configured && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your email is configured and ready to send workflow messages.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleTest}
            disabled={testing || !formData.smtpUser}
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Test Email
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={loading || !formData.smtpUser || !formData.smtpPassword}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
