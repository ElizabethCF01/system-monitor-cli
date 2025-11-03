#!/usr/bin/env node
import React, {useEffect, useMemo, useState} from 'react';
import {render, Box, Text, useApp, useInput, Spacer} from 'ink';
import os from 'node:os';
import si from 'systeminformation';
import {UsageBar} from './components/UsageBar.js';

const REFRESH_INTERVAL = 1000;
const PROCESS_LIMIT = 12;

type CpuMetrics = {
	total: number;
	perCore: number[];
	loadAverages: number[];
};

type MemoryMetrics = {
	used: number;
	total: number;
	swapUsed: number;
	swapTotal: number;
};

type ProcessInfo = {
	pid: number;
	name: string;
	user: string;
	cpu: number;
	memory: number;
	command: string;
};

type Metrics = {
	cpu: CpuMetrics;
	memory: MemoryMetrics;
	processes: ProcessInfo[];
	uptime: number;
};

function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes <= 0) {
		return '0 B';
	}

	const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
	const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const value = bytes / 1024 ** exponent;
	return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
}

function formatDuration(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds <= 0) {
		return '0s';
	}

	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	const parts = [];
	if (days > 0) {
		parts.push(`${days}d`);
	}

	if (hours > 0 || days > 0) {
		parts.push(`${hours}h`);
	}

	if (minutes > 0 || hours > 0 || days > 0) {
		parts.push(`${minutes}m`);
	}

	parts.push(`${secs}s`);
	return parts.join(' ');
}

function getUsageColor(value: number): string {
	if (!Number.isFinite(value)) {
		return 'gray';
	}

	if (value >= 90) {
		return 'red';
	}

	if (value >= 75) {
		return 'magenta';
	}

	if (value >= 50) {
		return 'yellow';
	}

	return 'green';
}

const App: React.FC = () => {
	const {exit} = useApp();
	const [metrics, setMetrics] = useState<Metrics | null>(null);
	const [error, setError] = useState<string | null>(null);

	useInput((input: string) => {
		if (input === 'q' || input === 'Q') {
			exit();
		}
	});

	useEffect(() => {
		let active = true;

		const fetchMetrics = async () => {
			try {
				const [load, memory, processes, time] = await Promise.all([
					si.currentLoad(),
					si.mem(),
					si.processes(),
					si.time()
				]);

				if (!active) {
					return;
				}

				const cpu: CpuMetrics = {
					total: load.currentLoad,
					perCore: load.cpus.map(core => core.load),
					loadAverages: os.loadavg()
				};

				const memoryMetrics: MemoryMetrics = {
					used: memory.active ?? memory.used,
					total: memory.total,
					swapUsed: memory.swapused,
					swapTotal: memory.swaptotal
				};

				const topProcesses: ProcessInfo[] = processes.list
					.filter(proc => proc.cpu > 0 || proc.mem > 0)
					.sort((a, b) => b.cpu - a.cpu)
					.slice(0, PROCESS_LIMIT)
					.map(proc => ({
						pid: proc.pid,
						name: proc.name || proc.command || 'unknown',
						user: proc.user || '-',
						cpu: proc.cpu,
						memory: proc.mem,
						command: proc.command || ''
					}));

				setMetrics({
					cpu,
					memory: memoryMetrics,
					processes: topProcesses,
					uptime: time.uptime
				});
				setError(null);
			} catch (err) {
				if (!active) {
					return;
				}

				setError(err instanceof Error ? err.message : 'Unknown error');
			}
		};

		fetchMetrics();
		const interval = setInterval(fetchMetrics, REFRESH_INTERVAL);

		return () => {
			active = false;
			clearInterval(interval);
		};
	}, []);

	const perCoreGrid = useMemo(() => {
		if (!metrics) {
			return null;
		}

		const perCore = metrics.cpu.perCore;
		const columns = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(perCore.length))));
		const rows = Math.ceil(perCore.length / columns);

		return Array.from({length: rows}, (_, rowIndex) => {
			const cells = Array.from({length: columns}, (_, columnIndex) => {
				const coreIndex = rowIndex * columns + columnIndex;
				if (coreIndex >= perCore.length) {
					return <Box key={`cpu-empty-${coreIndex}`} width={18} />;
				}

				const value = perCore[coreIndex];
				const label = `CPU${coreIndex.toString().padStart(2, '0')}:`;
				const valueText = `${value.toFixed(1).padStart(5)}%`;

				return (
					<Box key={`cpu-${coreIndex}`} width={18}>
						<Text color="gray">{label}</Text>
						<Text color={getUsageColor(value)}>{` ${valueText}`}</Text>
					</Box>
				);
			});

			return (
				<Box key={`cpu-row-${rowIndex}`} flexDirection="row" gap={2}>
					{cells}
				</Box>
			);
		});
	}, [metrics]);

	if (error) {
		return (
			<Box flexDirection="column">
				<Text color="red">Failed to fetch system metrics: {error}</Text>
				<Text color="gray">Press q to exit.</Text>
			</Box>
		);
	}

	if (!metrics) {
		return (
			<Box flexDirection="column">
				<Text color="cyan">Loading system metrics…</Text>
				<Text color="gray">Press q to exit.</Text>
			</Box>
		);
	}

	const {cpu, memory, processes, uptime} = metrics;
	const totalCpuColor = getUsageColor(cpu.total);
	const hostInfo = `${os.hostname()} • ${os.type()} ${os.release()} • ${os.arch()}`;

	return (
		<Box flexDirection="column" gap={1}>
			<Box>
				<Text bold color="green">
					System Monitor
				</Text>
				<Spacer />
				<Text color="gray">{hostInfo}</Text>
			</Box>

			<Box gap={1} flexWrap="wrap">
				<Text color="gray">Uptime:</Text>
				<Text color="yellow">{formatDuration(uptime)}</Text>
				<Text color="gray">Load Avg:</Text>
				<Text color="yellow">
					{cpu.loadAverages.map(value => value.toFixed(2)).join(' / ')}
				</Text>
				<Text color="gray">Total CPU:</Text>
				<Text color={totalCpuColor}>{cpu.total.toFixed(1)}%</Text>
			</Box>

			<Box gap={4} flexWrap="wrap">
				<Box flexDirection="column" flexGrow={1} minWidth={32} gap={0}>
					<Text bold color="yellow">CPU Usage</Text>
						<Box flexDirection="column" gap={0}>
							{perCoreGrid}
						</Box>
					</Box>

				<Box flexDirection="column" flexGrow={1} minWidth={32} gap={1}>
					<Text bold color="yellow">
						Memory
					</Text>
					<UsageBar
						label={`${formatBytes(memory.used)} / ${formatBytes(memory.total)}`}
						percentage={(memory.used / memory.total) * 100}
						color="magenta"
					/>
					<UsageBar
						label={`Swap ${formatBytes(memory.swapUsed)} / ${formatBytes(memory.swapTotal)}`}
						percentage={
							memory.swapTotal > 0 ? (memory.swapUsed / memory.swapTotal) * 100 : 0
						}
						color="red"
					/>
				</Box>
			</Box>

			<Box flexDirection="column">
				<Text bold color="yellow">
					Top Processes (sorted by CPU) — press q to quit
				</Text>
				<Box>
					<Text color="gray">
						{[
							' PID '.padEnd(7),
							'USER'.padEnd(10),
							'CPU%'.padEnd(6),
							'MEM%'.padEnd(6),
							'NAME'.padEnd(22),
							'COMMAND'
						].join(' ')}
					</Text>
				</Box>
				{processes.length === 0 ? (
					<Text color="gray">No active processes found.</Text>
				) : (
					processes.map(proc => {
						const displayName = proc.name.length > 22 ? `${proc.name.slice(0, 19)}…` : proc.name;
						const displayCommand =
							proc.command.length > 40 ? `${proc.command.slice(0, 37)}…` : proc.command;

						return (
							<Text key={proc.pid}>
								<Text color="gray">{`${proc.pid.toString().padStart(5)} `}</Text>
								<Text color="green">{`${proc.user.padEnd(10).slice(0, 10)} `}</Text>
								<Text color="cyan">{`${proc.cpu.toFixed(1).padStart(5)} `}</Text>
								<Text color="magenta">{`${proc.memory.toFixed(1).padStart(5)} `}</Text>
								<Text color="white">{displayName.padEnd(22)}</Text>
								<Text color="gray"> {displayCommand}</Text>
							</Text>
						);
					})
				)}
			</Box>
		</Box>
	);
};

render(<App />);
