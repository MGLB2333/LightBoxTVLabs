import React, { useState } from 'react';
import { Box, Typography, TextField, Divider, InputAdornment, Button } from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import AddIcon from '@mui/icons-material/Add';
import { useAudienceBuilder } from '../AudienceBuilderContext.jsx';

const AudienceStep1 = () => {
  const {
    audienceName, setAudienceName,
    audienceReach, setAudienceReach,
    audienceStartDate, setAudienceStartDate,
    audienceEndDate, setAudienceEndDate,
    audienceDescription, setAudienceDescription,
    linearBudget, setLinearBudget,
    ctvBudget, setCtvBudget,
    oohBudget, setOohBudget
  } = useAudienceBuilder();
  const [showBudget, setShowBudget] = useState(false);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <GroupIcon sx={{ color: 'primary.main', mr: 1 }} />
          <Typography variant="h6" gutterBottom fontWeight={700}>Audience Details</Typography>
        </Box>
        <img src="/copilot.png" alt="Copilot" style={{ height: 36, marginLeft: 16, display: 'block' }} />
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, fontSize: 13, width: '100%' }}>
        This section captures the core details of your audience and campaign goals.
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
        {/* Audience Description at the top */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ minWidth: 160, pt: 1 }}>
            <Typography variant="subtitle2" fontWeight={500}>Audience Description</Typography>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Describe your target audience..."
            value={audienceDescription}
            onChange={e => setAudienceDescription(e.target.value)}
          />
        </Box>
        {/* Audience Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ minWidth: 160 }}>
            <Typography variant="subtitle2" fontWeight={500}>Audience Name</Typography>
          </Box>
          <TextField
            fullWidth
            value={audienceName}
            onChange={e => setAudienceName(e.target.value)}
            size="small"
          />
        </Box>
        {/* Target Reach + Dates on same row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ minWidth: 160 }}>
            <Typography variant="subtitle2" fontWeight={500}>Target Reach</Typography>
          </Box>
          <Box sx={{ flex: 1, display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              type="number"
              value={audienceReach}
              onChange={e => setAudienceReach(e.target.value)}
              size="small"
              InputProps={{ endAdornment: <InputAdornment position="end">people</InputAdornment> }}
            />
            <TextField
              fullWidth
              type="date"
              value={audienceStartDate}
              onChange={e => setAudienceStartDate(e.target.value)}
              size="small"
              label="Start Date"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              type="date"
              value={audienceEndDate}
              onChange={e => setAudienceEndDate(e.target.value)}
              size="small"
              label="End Date"
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </Box>
        <Divider sx={{ my: 2 }} />
        {/* Budget Section: Button or Fields */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 56 }}>
          <Box sx={{ minWidth: 160 }}>
            <Typography variant="subtitle2" fontWeight={500}>Budget Breakdown</Typography>
          </Box>
          <Box sx={{ flex: 1, display: 'flex', gap: 2, alignItems: 'center' }}>
            {!showBudget ? (
              <>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setShowBudget(true)}
                  sx={{ height: 40, minWidth: 180, justifyContent: 'flex-start' }}
                >
                  Enter budget
                </Button>
                <Typography variant="body2" sx={{ color: 'text.disabled', fontSize: 13, ml: 1 }}>
                  If you know your budget at this stage, you can enter it here. Otherwise, you may leave this blank.
                </Typography>
              </>
            ) : (
              <>
                <TextField
                  fullWidth
                  type="number"
                  value={linearBudget}
                  onChange={e => setLinearBudget(e.target.value)}
                  size="small"
                  label="Linear (TVR)"
                  InputProps={{ startAdornment: <InputAdornment position="start">£</InputAdornment> }}
                />
                <TextField
                  fullWidth
                  type="number"
                  value={ctvBudget}
                  onChange={e => setCtvBudget(e.target.value)}
                  size="small"
                  label="CTV (CPM)"
                  InputProps={{ startAdornment: <InputAdornment position="start">£</InputAdornment> }}
                />
                <TextField
                  fullWidth
                  type="number"
                  value={oohBudget}
                  onChange={e => setOohBudget(e.target.value)}
                  size="small"
                  label="OOH (CPM)"
                  InputProps={{ startAdornment: <InputAdornment position="start">£</InputAdornment> }}
                />
              </>
            )}
          </Box>
        </Box>
        {/* Total Budget: Only show if budget fields are visible */}
        {showBudget && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ minWidth: 160 }}>
              <Typography variant="subtitle2" fontWeight={500}>Total Budget</Typography>
            </Box>
            <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>
              £{((Number(linearBudget) || 0) + (Number(ctvBudget) || 0) + (Number(oohBudget) || 0)).toLocaleString()}
            </Typography>
          </Box>
        )}
        <Divider sx={{ my: 2 }} />
      </Box>
    </Box>
  );
};

export default AudienceStep1; 