<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmAccounts
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
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmAccounts))
        Me.GroupBox11 = New System.Windows.Forms.GroupBox
        Me.Label53 = New System.Windows.Forms.Label
        Me.CombAcc2 = New System.Windows.Forms.ComboBox
        Me.btnSection = New System.Windows.Forms.Button
        Me.Label54 = New System.Windows.Forms.Label
        Me.CombAcc1 = New System.Windows.Forms.ComboBox
        Me.btnDept = New System.Windows.Forms.Button
        Me.TreeAcc = New System.Windows.Forms.TreeView
        Me.Label8 = New System.Windows.Forms.Label
        Me.CombMainAcc = New System.Windows.Forms.ComboBox
        Me.GroupBox11.SuspendLayout()
        Me.SuspendLayout()
        '
        'GroupBox11
        '
        Me.GroupBox11.Controls.Add(Me.Label53)
        Me.GroupBox11.Controls.Add(Me.CombAcc2)
        Me.GroupBox11.Controls.Add(Me.btnSection)
        Me.GroupBox11.Controls.Add(Me.Label54)
        Me.GroupBox11.Controls.Add(Me.CombAcc1)
        Me.GroupBox11.Controls.Add(Me.btnDept)
        Me.GroupBox11.Location = New System.Drawing.Point(290, 85)
        Me.GroupBox11.Name = "GroupBox11"
        Me.GroupBox11.Size = New System.Drawing.Size(344, 72)
        Me.GroupBox11.TabIndex = 1
        Me.GroupBox11.TabStop = False
        '
        'Label53
        '
        Me.Label53.AutoSize = True
        Me.Label53.Location = New System.Drawing.Point(251, 48)
        Me.Label53.Name = "Label53"
        Me.Label53.Size = New System.Drawing.Size(87, 13)
        Me.Label53.TabIndex = 79
        Me.Label53.Text = "الحسابات الفرعية"
        '
        'CombAcc2
        '
        Me.CombAcc2.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombAcc2.FormattingEnabled = True
        Me.CombAcc2.Location = New System.Drawing.Point(49, 45)
        Me.CombAcc2.Name = "CombAcc2"
        Me.CombAcc2.Size = New System.Drawing.Size(196, 21)
        Me.CombAcc2.TabIndex = 2
        '
        'btnSection
        '
        Me.btnSection.Location = New System.Drawing.Point(8, 45)
        Me.btnSection.Name = "btnSection"
        Me.btnSection.Size = New System.Drawing.Size(35, 23)
        Me.btnSection.TabIndex = 3
        Me.btnSection.Text = "+"
        Me.btnSection.UseVisualStyleBackColor = True
        '
        'Label54
        '
        Me.Label54.AutoSize = True
        Me.Label54.Location = New System.Drawing.Point(251, 20)
        Me.Label54.Name = "Label54"
        Me.Label54.Size = New System.Drawing.Size(50, 13)
        Me.Label54.TabIndex = 76
        Me.Label54.Text = "الحسابات"
        '
        'CombAcc1
        '
        Me.CombAcc1.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombAcc1.FormattingEnabled = True
        Me.CombAcc1.Location = New System.Drawing.Point(49, 15)
        Me.CombAcc1.Name = "CombAcc1"
        Me.CombAcc1.Size = New System.Drawing.Size(196, 21)
        Me.CombAcc1.TabIndex = 0
        '
        'btnDept
        '
        Me.btnDept.Location = New System.Drawing.Point(8, 15)
        Me.btnDept.Name = "btnDept"
        Me.btnDept.Size = New System.Drawing.Size(35, 23)
        Me.btnDept.TabIndex = 1
        Me.btnDept.Text = "+"
        Me.btnDept.UseVisualStyleBackColor = True
        '
        'TreeAcc
        '
        Me.TreeAcc.Dock = System.Windows.Forms.DockStyle.Left
        Me.TreeAcc.Font = New System.Drawing.Font("Times New Roman", 12.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.TreeAcc.Location = New System.Drawing.Point(0, 0)
        Me.TreeAcc.Name = "TreeAcc"
        Me.TreeAcc.Size = New System.Drawing.Size(285, 338)
        Me.TreeAcc.TabIndex = 2
        '
        'Label8
        '
        Me.Label8.AutoSize = True
        Me.Label8.Location = New System.Drawing.Point(541, 59)
        Me.Label8.Name = "Label8"
        Me.Label8.Size = New System.Drawing.Size(44, 13)
        Me.Label8.TabIndex = 44
        Me.Label8.Text = "الحساب"
        '
        'CombMainAcc
        '
        Me.CombMainAcc.BackColor = System.Drawing.Color.Black
        Me.CombMainAcc.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombMainAcc.Font = New System.Drawing.Font("Times New Roman", 12.0!, System.Drawing.FontStyle.Bold)
        Me.CombMainAcc.ForeColor = System.Drawing.Color.LawnGreen
        Me.CombMainAcc.FormattingEnabled = True
        Me.CombMainAcc.Items.AddRange(New Object() {"الإيرادات", "المنصرفات", "حسابات النقدية"})
        Me.CombMainAcc.Location = New System.Drawing.Point(313, 52)
        Me.CombMainAcc.Name = "CombMainAcc"
        Me.CombMainAcc.Size = New System.Drawing.Size(222, 27)
        Me.CombMainAcc.TabIndex = 0
        '
        'frmAccounts
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(641, 338)
        Me.Controls.Add(Me.Label8)
        Me.Controls.Add(Me.CombMainAcc)
        Me.Controls.Add(Me.TreeAcc)
        Me.Controls.Add(Me.GroupBox11)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(649, 372)
        Me.MinimumSize = New System.Drawing.Size(649, 372)
        Me.Name = "frmAccounts"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "إدخال الحسابات"
        Me.GroupBox11.ResumeLayout(False)
        Me.GroupBox11.PerformLayout()
        Me.ResumeLayout(False)
        Me.PerformLayout()

    End Sub
    Friend WithEvents GroupBox11 As System.Windows.Forms.GroupBox
    Friend WithEvents Label53 As System.Windows.Forms.Label
    Friend WithEvents CombAcc2 As System.Windows.Forms.ComboBox
    Friend WithEvents btnSection As System.Windows.Forms.Button
    Friend WithEvents Label54 As System.Windows.Forms.Label
    Friend WithEvents CombAcc1 As System.Windows.Forms.ComboBox
    Friend WithEvents btnDept As System.Windows.Forms.Button
    Friend WithEvents TreeAcc As System.Windows.Forms.TreeView
    Friend WithEvents Label8 As System.Windows.Forms.Label
    Friend WithEvents CombMainAcc As System.Windows.Forms.ComboBox
End Class
