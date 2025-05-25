import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  IconButton, 
  TextField,
  Tooltip,
  Divider,
  FormControl
} from '@mui/material';
import { 
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatListBulleted as BulletListIcon,
  FormatListNumbered as NumberedListIcon,
  Send as SendIcon
} from '@mui/icons-material';

interface RichTextEditorProps {
  initialValue?: string;
  placeholder?: string;
  onSubmit: (text: string) => void;
  submitButtonText?: string;
  disabled?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialValue = '',
  placeholder = 'Write a comment...',
  onSubmit,
  submitButtonText = 'Submit',
  disabled = false
}) => {
  const [text, setText] = useState(initialValue);
  
  const handleFormatting = (format: string) => {
    // Get current selection
    const input = document.getElementById('rich-text-field') as HTMLTextAreaElement;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = text.substring(start, end);
    
    let formattedText = '';
    let newCursorPos = end;
    
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        newCursorPos = start + formattedText.length;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        newCursorPos = start + formattedText.length;
        break;
      case 'bullet-list':
        formattedText = selectedText
          .split('\n')
          .map(line => `• ${line}`)
          .join('\n');
        newCursorPos = start + formattedText.length;
        break;
      case 'numbered-list':
        formattedText = selectedText
          .split('\n')
          .map((line, i) => `${i + 1}. ${line}`)
          .join('\n');
        newCursorPos = start + formattedText.length;
        break;
      default:
        formattedText = selectedText;
    }
    
    // Replace selected text with formatted text
    const newText = text.substring(0, start) + formattedText + text.substring(end);
    setText(newText);
    
    // Set focus back to the input field
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };
  
  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text);
      setText('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl+Enter
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  return (
    <Box>
      <Box display="flex" alignItems="center" mb={1} p={1} bgcolor="background.paper" borderRadius={1}>
        <Tooltip title="Bold">
          <IconButton 
            size="small" 
            onClick={() => handleFormatting('bold')}
            disabled={disabled}
          >
            <BoldIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Italic">
          <IconButton 
            size="small" 
            onClick={() => handleFormatting('italic')}
            disabled={disabled}
          >
            <ItalicIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        
        <Tooltip title="Bullet List">
          <IconButton 
            size="small" 
            onClick={() => handleFormatting('bullet-list')}
            disabled={disabled}
          >
            <BulletListIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Numbered List">
          <IconButton 
            size="small" 
            onClick={() => handleFormatting('numbered-list')}
            disabled={disabled}
          >
            <NumberedListIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Box flexGrow={1} />
        
        <Tooltip title="Ctrl+Enter to submit">
          <span>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<SendIcon />}
              onClick={handleSubmit}
              disabled={!text.trim() || disabled}
            >
              {submitButtonText}
            </Button>
          </span>
        </Tooltip>
      </Box>
      
      <FormControl fullWidth>
        <TextField
          id="rich-text-field"
          multiline
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          fullWidth
          disabled={disabled}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '4px'
            }
          }}
        />
      </FormControl>
    </Box>
  );
};

export default RichTextEditor; 