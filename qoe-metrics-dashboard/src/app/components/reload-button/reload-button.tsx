import { ReplayTwoTone } from '@mui/icons-material';
import { Button, ButtonProps, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { useContext } from 'react';
import { useSseReloadList } from '../../api/ApiController';
import { EnvContext } from '../../env.context';

/**
 * Button to reload the list of reports
 *
 * @param action
 */
export function ReloadButton({ action }: { action: () => void }) {
    const envCtx = useContext(EnvContext);

    const { reloadCount, resetReloadCount } = useSseReloadList(envCtx.backendUrl);

    const ReloadButton = styled(Button)<ButtonProps>(({ theme }) => ({
        background: theme.palette.background.default,
        color: theme.palette.text.primary,
        size: 'large',
        margin: '1rem',
        maxInlineSize: '15rem'
    }));

    const handleReload = () => {
        if (action) {
            action();
        }
        resetReloadCount();
    };

    return (
        <Tooltip title="The number of new reports that have been received by the server">
            <ReloadButton className="reloadButton" onClick={handleReload} startIcon={<ReplayTwoTone/>} variant={'contained'}>
                Reload count: {reloadCount}
            </ReloadButton>
        </Tooltip>
    );
}

export default ReloadButton;
