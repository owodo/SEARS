import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, 
  Send, 
  User,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  lab_id: string;
  sender?: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

const Messages = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
    const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && profile) {
      fetchMessages();
    }
  }, [user, profile]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(first_name, last_name, role)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !profile) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          sender_id: profile.id,
          lab_id: profile.lab_id
        });

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        return;
      }

      setNewMessage('');
      toast.success('Message sent successfully');
      fetchMessages(); // Refresh messages
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  if (!profile.lab_id) {
    return (
      <DashboardLayout>
        <Card className="shadow-card">
          <CardContent className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Lab Assigned</h3>
            <p className="text-muted-foreground">
              You need to be assigned to a lab to view and send messages
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lab Messages</h1>
          <p className="text-muted-foreground">
            Communicate with your lab team
          </p>
        </div>

        {/* Message Composer */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Send className="w-5 h-5" />
              <span>Send Message</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Type your message here..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              rows={3}
            />
            <div className="flex justify-end">
              <Button 
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className="bg-gradient-primary hover:opacity-90"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Message
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Messages List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
            <CardDescription>Latest messages from your lab team</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMessages ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No messages yet</h3>
                <p className="text-muted-foreground">
                  Start the conversation by sending the first message
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-smooth">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div>
                          <span className="font-medium text-foreground">
                            {message.sender ? 
                              `${message.sender.first_name} ${message.sender.last_name}` : 
                              'Unknown User'
                            }
                          </span>
                          {message.sender && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({message.sender.role})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(message.created_at).toLocaleString()}
                      </div>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Messages;