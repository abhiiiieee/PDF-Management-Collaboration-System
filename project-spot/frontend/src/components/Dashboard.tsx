import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  Card, 
  CardContent, 
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  InputAdornment
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Delete as DeleteIcon, Share as ShareIcon, Visibility as VisibilityIcon, Search as SearchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { pdfService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface PDF {
  id: string;
  filename: string;
  shareToken: string;
  createdAt: string;
  sharedWith: { email: string; accessType: string }[];
}

const Dashboard: React.FC = () => {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [currentPdfId, setCurrentPdfId] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [showShareLink, setShowShareLink] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchPdfs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await pdfService.getUserPdfs();
      setPdfs(response.pdfs);
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      showNotification('Failed to load your PDFs', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPdfs();
  }, [fetchPdfs]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.type !== 'application/pdf') {
      showNotification('Only PDF files are allowed', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 300);
      
      const response = await pdfService.uploadPdf(file);
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setPdfs(prev => [response.pdf, ...prev]);
      showNotification('PDF uploaded successfully', 'success');
    } catch (error) {
      console.error('Error uploading PDF:', error);
      showNotification('Failed to upload PDF', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Clear the input
      event.target.value = '';
    }
  };

  const handleViewPdf = (id: string) => {
    navigate(`/pdf/${id}`);
  };

  const handleSharePdf = (id: string) => {
    setCurrentPdfId(id);
    setShareDialogOpen(true);
  };

  const handleDeletePdf = async (id: string) => {
    try {
      await pdfService.deletePdf(id);
      setPdfs(prev => prev.filter(pdf => pdf.id !== id));
      showNotification('PDF deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting PDF:', error);
      showNotification('Failed to delete PDF', 'error');
    }
  };

  const handleShareSubmit = async () => {
    if (!currentPdfId || !shareEmail) return;
    
    try {
      const response = await pdfService.sharePdf(currentPdfId, shareEmail);
      setShareLink(response.shareLink);
      setShowShareLink(true);
      setPdfs(prev => prev.map(pdf => {
        if (pdf.id === currentPdfId) {
          const alreadyShared = pdf.sharedWith.find(share => share.email === shareEmail);
          if (!alreadyShared) {
            return {
              ...pdf,
              sharedWith: [...pdf.sharedWith, { email: shareEmail, accessType: 'view' }]
            };
          }
        }
        return pdf;
      }));
      showNotification('PDF shared successfully', 'success');
    } catch (error) {
      console.error('Error sharing PDF:', error);
      showNotification('Failed to share PDF', 'error');
    }
  };

  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
    setShareEmail('');
    setShareLink('');
    setShowShareLink(false);
    setCurrentPdfId(null);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    showNotification('Share link copied to clipboard', 'success');
  };

  const showNotification = (message: string, severity: 'success' | 'error') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const filteredPdfs = pdfs.filter(pdf => 
    pdf.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return <Typography>Please log in to view your dashboard</Typography>;
  }

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My PDF Dashboard
      </Typography>
      
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search PDFs by filename"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
      
      <Box sx={{ mb: 4 }}>
        <input
          accept="application/pdf"
          style={{ display: 'none' }}
          id="upload-pdf-button"
          type="file"
          onChange={handleFileUpload}
          disabled={isUploading}
        />
        <label htmlFor="upload-pdf-button">
          <Button
            variant="contained"
            component="span"
            disabled={isUploading}
          >
            Upload New PDF
          </Button>
        </label>
        
        {isUploading && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <CircularProgress size={24} sx={{ mr: 2 }} variant="determinate" value={uploadProgress} />
            <Typography variant="body2">
              {uploadProgress < 100 ? 'Uploading...' : 'Processing...'}
            </Typography>
          </Box>
        )}
      </Box>
      
      {isLoading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : filteredPdfs.length === 0 ? (
        searchTerm ? (
          <Typography variant="body1">No PDFs match your search. Try a different search term.</Typography>
        ) : (
          <Typography variant="body1">You haven't uploaded any PDFs yet. Upload your first PDF to get started!</Typography>
        )
      ) : (
        <Grid container spacing={3}>
          {filteredPdfs.map((pdf) => (
            // @ts-ignore -- Grid component type issues with MUI v5
            <Grid item xs={12} sm={6} md={4} key={pdf.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="div" noWrap title={pdf.filename}>
                    {pdf.filename}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Uploaded: {new Date(pdf.createdAt).toLocaleDateString()}
                  </Typography>
                  {pdf.sharedWith.length > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Shared with: {pdf.sharedWith.length} {pdf.sharedWith.length === 1 ? 'person' : 'people'}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Tooltip title="View PDF">
                    <IconButton onClick={() => handleViewPdf(pdf.id)} color="primary">
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Share PDF">
                    <IconButton onClick={() => handleSharePdf(pdf.id)} color="primary">
                      <ShareIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete PDF">
                    <IconButton onClick={() => handleDeletePdf(pdf.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={handleCloseShareDialog}>
        <DialogTitle>Share PDF</DialogTitle>
        <DialogContent>
          {!showShareLink ? (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Enter the email of the person you want to share this PDF with:
              </Typography>
              <TextField
                label="Email Address"
                type="email"
                fullWidth
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
              />
            </>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Share this link with your collaborator:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TextField
                  fullWidth
                  value={shareLink}
                  InputProps={{ readOnly: true }}
                />
                <Button onClick={copyShareLink} sx={{ ml: 1 }}>
                  Copy
                </Button>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          {!showShareLink ? (
            <>
              <Button onClick={handleCloseShareDialog}>Cancel</Button>
              <Button 
                onClick={handleShareSubmit}
                disabled={!shareEmail}
                variant="contained"
              >
                Share
              </Button>
            </>
          ) : (
            <Button onClick={handleCloseShareDialog}>Close</Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Notification Snackbar */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard; 