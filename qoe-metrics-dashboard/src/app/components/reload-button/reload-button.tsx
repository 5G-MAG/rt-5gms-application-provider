import { ReplayTwoTone } from '@mui/icons-material';
import { Button, ButtonProps, IconButton, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { useContext } from 'react';
import { theme } from '../../../theme';
import { useSseReloadList } from '../../api/ApiController';
import { EnvContext } from '../../env.context'

export function ReloadButton() {
    const envCtx = useContext(EnvContext);

    const { reloadCount, resetReloadCount } = useSseReloadList(envCtx.backendUrl);

    const ReloadButton = styled(Button)<ButtonProps>(({theme}) => ({
        background: theme.palette.background.default,
        color: theme.palette.text.primary,
        marginInline: '2rem',
    }));

    return (
        <ReloadButton onClick={() => resetReloadCount()} startIcon={<ReplayTwoTone/>} variant={'contained'}>
            Reload count: {reloadCount}
        </ReloadButton>
    );
}

export default ReloadButton;
