import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Drawer, 
  List, 
  ListItem, 
  ListItemText, 
  TextField, 
  Button, 
  IconButton,
  CircularProgress,
  Divider,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Send as SendIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { Document, Page, pdfjs } from 'react-pdf';
import { useParams } from 'react-router-dom';
import { pdfService, commentService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Set the worker source for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface Comment {
  _id: string;
  text: string;
  pageNumber: number;
  user?: {
    _id: string;
    name: string;
    email: string;
  };
  guestName?: string;
  guestEmail?: string;
  createdAt: string;
  position?: {
    x: number;
    y: number;
  };
}

interface PdfViewerProps {
  isShared?: boolean;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ isShared = false }) => {
  const { id, shareToken } = useParams<{ id: string; shareToken: string }>();
  const { user } = useAuth();
  
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [drawerWidth, setDrawerWidth] = useState(350);
  const [drawerOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<any>(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [editCommentId, setEditCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [guestInfoDialogOpen, setGuestInfoDialogOpen] = useState(false);
  const [tempComment, setTempComment] = useState('');
  
  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPdfData = async () => {
      setLoading(true);
      try {
        if (isShared && shareToken) {
          const response = await pdfService.getPdfByShareToken(shareToken);
          setPdfData(response.pdf);
          setPdfUrl(pdfService.getSharedPdfFileUrl(shareToken));
        } else if (id && user) {
          const response = await pdfService.getPdfById(id);
          setPdfData(response.pdf);
          setPdfUrl(pdfService.getPdfFileUrl(id));
        } else {
          setError('Missing PDF ID or share token');
        }
      } catch (error) {
        console.error('Error fetching PDF:', error);
        setError('Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    fetchPdfData();
  }, [id, shareToken, isShared, user]);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        let response;
        if (isShared && shareToken) {
          response = await commentService.getSharedPdfComments(shareToken);
        } else if (id && user) {
          response = await commentService.getPdfComments(id);
        } else {
          return;
        }
        
        setComments(response.comments);
      } catch (error) {
        console.error('Error fetching comments:', error);
        showNotification('Failed to load comments', 'error');
      }
    };

    if (pdfData) {
      fetchComments();
    }
  }, [pdfData, id, shareToken, isShared, user]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handlePageChange = (newPageNumber: number) => {
    if (newPageNumber >= 1 && newPageNumber <= (numPages || 1)) {
      setPageNumber(newPageNumber);
    }
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim()) return;
    
    try {
      const commentData = {
        text: newComment,
        pageNumber,
        position: { x: 0, y: 0 } // Default position
      };
      
      let response;
      
      if (isShared && shareToken) {
        // For shared PDFs - guests need to provide name and email
        if (!user && (!guestName || !guestEmail)) {
          setTempComment(newComment);
          setGuestInfoDialogOpen(true);
          return;
        }
        
        const guestData = !user ? { guestName, guestEmail } : {};
        response = await commentService.addCommentToShared(shareToken, {
          ...commentData,
          ...guestData
        });
      } else if (id && user) {
        response = await commentService.addComment(id, commentData);
      } else {
        showNotification('Cannot add comment', 'error');
        return;
      }
      
      setComments([...comments, response.comment]);
      setNewComment('');
      showNotification('Comment added successfully', 'success');
    } catch (error) {
      console.error('Error adding comment:', error);
      showNotification('Failed to add comment', 'error');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentService.deleteComment(commentId);
      setComments(comments.filter(comment => comment._id !== commentId));
      showNotification('Comment deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting comment:', error);
      showNotification('Failed to delete comment', 'error');
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditCommentId(comment._id);
    setEditCommentText(comment.text);
  };

  const submitEditComment = async () => {
    if (!editCommentId || !editCommentText.trim()) return;
    
    try {
      await commentService.editComment(editCommentId, editCommentText);
      
      // Update comments state
      setComments(comments.map(comment => 
        comment._id === editCommentId ? { ...comment, text: editCommentText } : comment
      ));
      
      setEditCommentId(null);
      setEditCommentText('');
      showNotification('Comment updated successfully', 'success');
    } catch (error) {
      console.error('Error updating comment:', error);
      showNotification('Failed to update comment', 'error');
    }
  };

  const cancelEditComment = () => {
    setEditCommentId(null);
    setEditCommentText('');
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

  const submitGuestInfo = async () => {
    if (!guestName || !guestEmail || !shareToken) {
      showNotification('Name and email are required', 'error');
      return;
    }
    
    try {
      const commentData = {
        text: tempComment,
        pageNumber,
        position: { x: 0, y: 0 },
        guestName,
        guestEmail
      };
      
      const response = await commentService.addCommentToShared(shareToken, commentData);
      
      setComments([...comments, response.comment]);
      setNewComment('');
      setTempComment('');
      setGuestInfoDialogOpen(false);
      showNotification('Comment added successfully', 'success');
    } catch (error) {
      console.error('Error adding comment:', error);
      showNotification('Failed to add comment', 'error');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="500px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const filteredComments = comments.filter(comment => comment.pageNumber === pageNumber);

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 100px)' }}>
      {/* Main PDF Display */}
      <Box 
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          p: 2,
          bgcolor: '#f5f5f5'
        }}
        ref={documentRef}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2, 
            width: 'fit-content', 
            mx: 'auto',
            mb: 2
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Button 
              disabled={pageNumber <= 1} 
              onClick={() => handlePageChange(pageNumber - 1)}
            >
              Previous
            </Button>
            <Typography>
              Page {pageNumber} of {numPages || '?'}
            </Typography>
            <Button 
              disabled={pageNumber >= (numPages || 1)} 
              onClick={() => handlePageChange(pageNumber + 1)}
            >
              Next
            </Button>
          </Box>
          
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<CircularProgress />}
            error={<Alert severity="error">Failed to load PDF file</Alert>}
          >
            <Page 
              pageNumber={pageNumber} 
              renderTextLayer={false}
              renderAnnotationLayer={false}
              width={600}
            />
          </Document>
        </Paper>
      </Box>

      {/* Comments Drawer */}
      <Drawer
        variant="persistent"
        anchor="right"
        open={drawerOpen}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            position: 'relative',
            height: '100%',
            border: 'none',
            boxShadow: '-2px 0 5px rgba(0,0,0,0.1)'
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Comments (Page {pageNumber})
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Box sx={{ height: 'calc(100vh - 250px)', overflow: 'auto', mb: 2 }}>
            {filteredComments.length === 0 ? (
              <Typography color="text.secondary">
                No comments on this page yet
              </Typography>
            ) : (
              <List>
                {filteredComments.map((comment) => (
                  <ListItem 
                    key={comment._id}
                    alignItems="flex-start"
                    sx={{ 
                      bgcolor: '#f9f9f9', 
                      mb: 1, 
                      borderRadius: 1,
                      flexDirection: 'column',
                      alignItems: 'stretch'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {comment.user ? comment.user.name : comment.guestName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(comment.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                      
                      {(user && comment.user && user.id === comment.user._id) && (
                        <Box>
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditComment(comment)}
                            sx={{ p: 0.5 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteComment(comment._id)}
                            color="error"
                            sx={{ p: 0.5 }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                    
                    {editCommentId === comment._id ? (
                      <Box sx={{ mt: 1 }}>
                        <TextField
                          multiline
                          fullWidth
                          size="small"
                          value={editCommentText}
                          onChange={e => setEditCommentText(e.target.value)}
                          sx={{ mb: 1 }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <Button size="small" onClick={cancelEditComment}>
                            Cancel
                          </Button>
                          <Button 
                            size="small" 
                            variant="contained" 
                            onClick={submitEditComment}
                          >
                            Save
                          </Button>
                        </Box>
                      </Box>
                    ) : (
                      <ListItemText 
                        primary={comment.text}
                        sx={{ whiteSpace: 'pre-wrap' }}
                      />
                    )}
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
          
          <Box>
            <TextField
              label="Add a comment"
              multiline
              rows={3}
              fullWidth
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              sx={{ mb: 1 }}
            />
            <Button
              variant="contained"
              endIcon={<SendIcon />}
              fullWidth
              onClick={handleCommentSubmit}
              disabled={!newComment.trim()}
            >
              Comment
            </Button>
          </Box>
        </Box>
      </Drawer>
      
      {/* Guest Information Dialog */}
      <Dialog open={guestInfoDialogOpen} onClose={() => setGuestInfoDialogOpen(false)}>
        <DialogTitle>Your Information</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Please provide your name and email to continue
          </Typography>
          <TextField
            label="Your Name"
            fullWidth
            margin="normal"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            required
          />
          <TextField
            label="Your Email"
            type="email"
            fullWidth
            margin="normal"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGuestInfoDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={submitGuestInfo}
            variant="contained"
            disabled={!guestName || !guestEmail}
          >
            Submit
          </Button>
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

export default PdfViewer; 