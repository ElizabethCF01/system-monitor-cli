import React from 'react';
import {Box, Text} from 'ink';

type UsageBarProps = {
	width?: number;
	percentage: number;
	color?: string;
	label?: string;
};

const FULL_BLOCK = '█';
const EMPTY_BLOCK = '░';

export function UsageBar({width = 24, percentage, color = 'green', label}: UsageBarProps) {
	const normalized = Number.isFinite(percentage) ? Math.max(0, Math.min(percentage, 100)) : 0;
	const filledLength = Math.round((normalized / 100) * width);
	const emptyLength = Math.max(0, width - filledLength);

	return (
		<Box flexDirection="column">
			{label ? (
				<Text>
					<Text color="gray">{label}</Text>{' '}
					<Text color={color}>{normalized.toFixed(1)}%</Text>
				</Text>
			) : null}
			<Box>
				<Text color={color}>{FULL_BLOCK.repeat(filledLength)}</Text>
				<Text color="gray">{EMPTY_BLOCK.repeat(emptyLength)}</Text>
			</Box>
		</Box>
	);
}
