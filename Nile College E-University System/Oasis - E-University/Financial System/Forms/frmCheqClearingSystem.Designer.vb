<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmCheqClearingSystem
    Inherits System.Windows.Forms.Form

    'Form overrides dispose to clean up the component list.
    <System.Diagnostics.DebuggerNonUserCode()> _
    Protected Overrides Sub Dispose(ByVal disposing As Boolean)
        Try
            If disposing AndAlso components IsNot Nothing Then
                components.Dispose()
            End If
        Finally
            MyBase.Dispose(disposing)
        End Try
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    <System.Diagnostics.DebuggerStepThrough()> _
    Private Sub InitializeComponent()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmCheqClearingSystem))
        Me.GroupBox6 = New System.Windows.Forms.GroupBox()
        Me.RAll = New System.Windows.Forms.RadioButton()
        Me.RCleared = New System.Windows.Forms.RadioButton()
        Me.RPending = New System.Windows.Forms.RadioButton()
        Me.GridVouchers = New System.Windows.Forms.DataGridView()
        Me.Column8 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column10 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column1 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column9 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column2 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column3 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column5 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column6 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column11 = New System.Windows.Forms.DataGridViewTextBoxColumn()
        Me.Column7 = New System.Windows.Forms.DataGridViewButtonColumn()
        Me.Column4 = New System.Windows.Forms.DataGridViewButtonColumn()
        Me.GroupBox6.SuspendLayout()
        CType(Me.GridVouchers, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'GroupBox6
        '
        Me.GroupBox6.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox6.Controls.Add(Me.RAll)
        Me.GroupBox6.Controls.Add(Me.RCleared)
        Me.GroupBox6.Controls.Add(Me.RPending)
        Me.GroupBox6.Location = New System.Drawing.Point(8, 4)
        Me.GroupBox6.Name = "GroupBox6"
        Me.GroupBox6.Size = New System.Drawing.Size(727, 45)
        Me.GroupBox6.TabIndex = 97
        Me.GroupBox6.TabStop = False
        Me.GroupBox6.Text = "Status"
        '
        'RAll
        '
        Me.RAll.AutoSize = True
        Me.RAll.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.RAll.Location = New System.Drawing.Point(324, 18)
        Me.RAll.Name = "RAll"
        Me.RAll.Size = New System.Drawing.Size(75, 17)
        Me.RAll.TabIndex = 3
        Me.RAll.Text = "Show All "
        Me.RAll.UseVisualStyleBackColor = False
        '
        'RCleared
        '
        Me.RCleared.AutoSize = True
        Me.RCleared.BackColor = System.Drawing.Color.LightGreen
        Me.RCleared.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.RCleared.Location = New System.Drawing.Point(177, 18)
        Me.RCleared.Name = "RCleared"
        Me.RCleared.Size = New System.Drawing.Size(68, 17)
        Me.RCleared.TabIndex = 2
        Me.RCleared.Text = "Cleared"
        Me.RCleared.UseVisualStyleBackColor = False
        '
        'RPending
        '
        Me.RPending.AutoSize = True
        Me.RPending.BackColor = System.Drawing.Color.Yellow
        Me.RPending.Checked = True
        Me.RPending.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.RPending.Location = New System.Drawing.Point(16, 18)
        Me.RPending.Name = "RPending"
        Me.RPending.Size = New System.Drawing.Size(133, 17)
        Me.RPending.TabIndex = 1
        Me.RPending.TabStop = True
        Me.RPending.Text = "Uncleared Cheques"
        Me.RPending.UseVisualStyleBackColor = False
        '
        'GridVouchers
        '
        Me.GridVouchers.AllowUserToAddRows = False
        Me.GridVouchers.AllowUserToDeleteRows = False
        Me.GridVouchers.Anchor = CType((((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GridVouchers.Columns.AddRange(New System.Windows.Forms.DataGridViewColumn() {Me.Column8, Me.Column10, Me.Column1, Me.Column9, Me.Column2, Me.Column3, Me.Column5, Me.Column6, Me.Column11, Me.Column7, Me.Column4})
        Me.GridVouchers.Location = New System.Drawing.Point(8, 55)
        Me.GridVouchers.MultiSelect = False
        Me.GridVouchers.Name = "GridVouchers"
        Me.GridVouchers.ReadOnly = True
        Me.GridVouchers.RowHeadersWidth = 50
        Me.GridVouchers.Size = New System.Drawing.Size(727, 360)
        Me.GridVouchers.TabIndex = 98
        '
        'Column8
        '
        Me.Column8.HeaderText = "SNo"
        Me.Column8.Name = "Column8"
        Me.Column8.ReadOnly = True
        Me.Column8.Visible = False
        '
        'Column10
        '
        Me.Column10.HeaderText = "Bank"
        Me.Column10.Name = "Column10"
        Me.Column10.ReadOnly = True
        Me.Column10.Width = 150
        '
        'Column1
        '
        Me.Column1.FillWeight = 75.0!
        Me.Column1.HeaderText = "Cheque No "
        Me.Column1.Name = "Column1"
        Me.Column1.ReadOnly = True
        Me.Column1.Width = 75
        '
        'Column9
        '
        Me.Column9.HeaderText = "Date of Exchange"
        Me.Column9.Name = "Column9"
        Me.Column9.ReadOnly = True
        Me.Column9.Width = 75
        '
        'Column2
        '
        Me.Column2.FillWeight = 150.0!
        Me.Column2.HeaderText = "Pay To"
        Me.Column2.Name = "Column2"
        Me.Column2.ReadOnly = True
        Me.Column2.Width = 150
        '
        'Column3
        '
        Me.Column3.FillWeight = 150.0!
        Me.Column3.HeaderText = "Details"
        Me.Column3.Name = "Column3"
        Me.Column3.ReadOnly = True
        Me.Column3.Width = 150
        '
        'Column5
        '
        Me.Column5.HeaderText = "Amount"
        Me.Column5.Name = "Column5"
        Me.Column5.ReadOnly = True
        '
        'Column6
        '
        Me.Column6.FillWeight = 74.31472!
        Me.Column6.HeaderText = "Release Date"
        Me.Column6.Name = "Column6"
        Me.Column6.ReadOnly = True
        Me.Column6.Width = 80
        '
        'Column11
        '
        Me.Column11.HeaderText = "status "
        Me.Column11.Name = "Column11"
        Me.Column11.ReadOnly = True
        '
        'Column7
        '
        Me.Column7.HeaderText = "Cleared"
        Me.Column7.Name = "Column7"
        Me.Column7.ReadOnly = True
        '
        'Column4
        '
        Me.Column4.HeaderText = "Rejected "
        Me.Column4.Name = "Column4"
        Me.Column4.ReadOnly = True
        '
        'frmCheqClearingSystem
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(743, 421)
        Me.Controls.Add(Me.GridVouchers)
        Me.Controls.Add(Me.GroupBox6)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.Name = "frmCheqClearingSystem"
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "Cheque Management"
        Me.WindowState = System.Windows.Forms.FormWindowState.Maximized
        Me.GroupBox6.ResumeLayout(False)
        Me.GroupBox6.PerformLayout()
        CType(Me.GridVouchers, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)

    End Sub
    Friend WithEvents GroupBox6 As System.Windows.Forms.GroupBox
    Friend WithEvents RPending As System.Windows.Forms.RadioButton
    Friend WithEvents RCleared As System.Windows.Forms.RadioButton
    Friend WithEvents GridVouchers As System.Windows.Forms.DataGridView
    Friend WithEvents RAll As System.Windows.Forms.RadioButton
    Friend WithEvents Column8 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column10 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column1 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column9 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column2 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column3 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column5 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column6 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column11 As System.Windows.Forms.DataGridViewTextBoxColumn
    Friend WithEvents Column7 As System.Windows.Forms.DataGridViewButtonColumn
    Friend WithEvents Column4 As System.Windows.Forms.DataGridViewButtonColumn
End Class
