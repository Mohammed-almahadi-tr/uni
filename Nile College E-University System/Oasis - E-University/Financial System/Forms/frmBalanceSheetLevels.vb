Imports System.Data.SqlClient

Public Class frmBalanceSheetLevels
    Inherits System.Windows.Forms.Form

#Region " Windows Form Designer generated code "

    Public Sub New()
        MyBase.New()

        'This call is required by the Windows Form Designer.
        InitializeComponent()

        'Add any initialization after the InitializeComponent() call

    End Sub

    'Form overrides dispose to clean up the component list.
    Protected Overloads Overrides Sub Dispose(ByVal disposing As Boolean)
        If disposing Then
            If Not (components Is Nothing) Then
                components.Dispose()
            End If
        End If
        MyBase.Dispose(disposing)
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents DateTimePicker1 As System.Windows.Forms.DateTimePicker
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents btnClose As System.Windows.Forms.Button
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents R4 As System.Windows.Forms.RadioButton
    Friend WithEvents R3 As System.Windows.Forms.RadioButton
    Friend WithEvents R2 As System.Windows.Forms.RadioButton
    Friend WithEvents R1 As System.Windows.Forms.RadioButton
    Friend WithEvents GroupBox3 As System.Windows.Forms.GroupBox
    Friend WithEvents btnShow As System.Windows.Forms.Button
    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmBalanceSheetLevels))
        Me.GroupBox1 = New System.Windows.Forms.GroupBox()
        Me.R4 = New System.Windows.Forms.RadioButton()
        Me.R3 = New System.Windows.Forms.RadioButton()
        Me.R2 = New System.Windows.Forms.RadioButton()
        Me.R1 = New System.Windows.Forms.RadioButton()
        Me.Label1 = New System.Windows.Forms.Label()
        Me.DateTimePicker1 = New System.Windows.Forms.DateTimePicker()
        Me.GroupBox2 = New System.Windows.Forms.GroupBox()
        Me.btnClose = New System.Windows.Forms.Button()
        Me.btnShow = New System.Windows.Forms.Button()
        Me.GroupBox3 = New System.Windows.Forms.GroupBox()
        Me.GroupBox1.SuspendLayout()
        Me.GroupBox3.SuspendLayout()
        Me.SuspendLayout()
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.R4)
        Me.GroupBox1.Controls.Add(Me.R3)
        Me.GroupBox1.Controls.Add(Me.R2)
        Me.GroupBox1.Controls.Add(Me.R1)
        Me.GroupBox1.Location = New System.Drawing.Point(7, 3)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(479, 45)
        Me.GroupBox1.TabIndex = 0
        Me.GroupBox1.TabStop = False
        Me.GroupBox1.Text = "Level"
        '
        'R4
        '
        Me.R4.AutoSize = True
        Me.R4.Location = New System.Drawing.Point(336, 17)
        Me.R4.Name = "R4"
        Me.R4.RightToLeft = System.Windows.Forms.RightToLeft.No
        Me.R4.Size = New System.Drawing.Size(78, 17)
        Me.R4.TabIndex = 6
        Me.R4.Text = "Level Four "
        Me.R4.UseVisualStyleBackColor = True
        '
        'R3
        '
        Me.R3.AutoSize = True
        Me.R3.Location = New System.Drawing.Point(232, 17)
        Me.R3.Name = "R3"
        Me.R3.RightToLeft = System.Windows.Forms.RightToLeft.No
        Me.R3.Size = New System.Drawing.Size(81, 17)
        Me.R3.TabIndex = 5
        Me.R3.Text = "Level Three"
        Me.R3.UseVisualStyleBackColor = True
        '
        'R2
        '
        Me.R2.AutoSize = True
        Me.R2.Location = New System.Drawing.Point(122, 17)
        Me.R2.Name = "R2"
        Me.R2.RightToLeft = System.Windows.Forms.RightToLeft.No
        Me.R2.Size = New System.Drawing.Size(73, 17)
        Me.R2.TabIndex = 4
        Me.R2.Text = "Level Two"
        Me.R2.UseVisualStyleBackColor = True
        '
        'R1
        '
        Me.R1.AutoSize = True
        Me.R1.Checked = True
        Me.R1.Location = New System.Drawing.Point(22, 17)
        Me.R1.Name = "R1"
        Me.R1.RightToLeft = System.Windows.Forms.RightToLeft.No
        Me.R1.Size = New System.Drawing.Size(73, 17)
        Me.R1.TabIndex = 2
        Me.R1.TabStop = True
        Me.R1.Text = "Level One"
        Me.R1.UseVisualStyleBackColor = True
        '
        'Label1
        '
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(19, 19)
        Me.Label1.Name = "Label1"
        Me.Label1.RightToLeft = System.Windows.Forms.RightToLeft.No
        Me.Label1.Size = New System.Drawing.Size(28, 13)
        Me.Label1.TabIndex = 1
        Me.Label1.Text = "On :"
        '
        'DateTimePicker1
        '
        Me.DateTimePicker1.Location = New System.Drawing.Point(53, 15)
        Me.DateTimePicker1.Name = "DateTimePicker1"
        Me.DateTimePicker1.Size = New System.Drawing.Size(200, 20)
        Me.DateTimePicker1.TabIndex = 0
        '
        'GroupBox2
        '
        Me.GroupBox2.Location = New System.Drawing.Point(7, 98)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(479, 8)
        Me.GroupBox2.TabIndex = 49
        Me.GroupBox2.TabStop = False
        '
        'btnClose
        '
        Me.btnClose.DialogResult = System.Windows.Forms.DialogResult.Cancel
        Me.btnClose.ImeMode = System.Windows.Forms.ImeMode.NoControl
        Me.btnClose.Location = New System.Drawing.Point(411, 112)
        Me.btnClose.Name = "btnClose"
        Me.btnClose.Size = New System.Drawing.Size(75, 32)
        Me.btnClose.TabIndex = 48
        Me.btnClose.Text = "Close"
        '
        'btnShow
        '
        Me.btnShow.DialogResult = System.Windows.Forms.DialogResult.Cancel
        Me.btnShow.ImeMode = System.Windows.Forms.ImeMode.NoControl
        Me.btnShow.Location = New System.Drawing.Point(306, 112)
        Me.btnShow.Name = "btnShow"
        Me.btnShow.Size = New System.Drawing.Size(75, 32)
        Me.btnShow.TabIndex = 47
        Me.btnShow.Text = "Show "
        '
        'GroupBox3
        '
        Me.GroupBox3.Controls.Add(Me.DateTimePicker1)
        Me.GroupBox3.Controls.Add(Me.Label1)
        Me.GroupBox3.Location = New System.Drawing.Point(7, 50)
        Me.GroupBox3.Name = "GroupBox3"
        Me.GroupBox3.Size = New System.Drawing.Size(479, 46)
        Me.GroupBox3.TabIndex = 50
        Me.GroupBox3.TabStop = False
        Me.GroupBox3.Text = "Date"
        '
        'frmBalanceSheetLevels
        '
        Me.AcceptButton = Me.btnShow
        Me.AutoScaleBaseSize = New System.Drawing.Size(5, 13)
        Me.CancelButton = Me.btnClose
        Me.ClientSize = New System.Drawing.Size(493, 148)
        Me.Controls.Add(Me.GroupBox3)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.btnClose)
        Me.Controls.Add(Me.btnShow)
        Me.Controls.Add(Me.GroupBox1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(509, 187)
        Me.MinimumSize = New System.Drawing.Size(509, 187)
        Me.Name = "frmBalanceSheetLevels"
        Me.SizeGripStyle = System.Windows.Forms.SizeGripStyle.Hide
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "Balances"
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        Me.GroupBox3.ResumeLayout(False)
        Me.GroupBox3.PerformLayout()
        Me.ResumeLayout(False)

    End Sub

#End Region

    Private Sub btnClose_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnClose.Click
        Me.Close()
    End Sub

    Private Sub btnSave_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnShow.Click
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim dap As New SqlDataAdapter("Select Acc1,Acc2,Acc3,Acc4,Sum(TotalValueIn)-Sum(TotalValueout) TotalValueout,N'" & _
                                          Me.DateTimePicker1.Value.ToShortDateString & " 00:00:00' TransDate From Transactions " & _
                                          "Where Transdate < N'" & Me.DateTimePicker1.Value.ToShortDateString & _
                                         " 23:59:59' group by Acc1,Acc2,Acc3,Acc4 " & _
                                         "Having Sum(TotalValueout)-Sum(TotalValueIn)<>0", cnn)
            Dim das As New DataSet

            dap.Fill(das, "Transactions")

            If Me.R1.Checked = True Then
                Dim rpt As New BalanceSheetL1
                rpt.SetDataSource(das)
                RptViewer.CrystalReportViewer2.ReportSource = rpt
                RptViewer.CrystalReportViewer2.RefreshReport()
                RptViewer.ShowDialog()

            ElseIf Me.R2.Checked = True Then
                Dim rpt As New BalanceSheetL2
                rpt.SetDataSource(das)
                RptViewer.CrystalReportViewer2.ReportSource = rpt
                RptViewer.CrystalReportViewer2.RefreshReport()
                RptViewer.ShowDialog()

            ElseIf Me.R3.Checked = True Then
                Dim rpt As New BalanceSheetL3
                rpt.SetDataSource(das)
                RptViewer.CrystalReportViewer2.ReportSource = rpt
                RptViewer.CrystalReportViewer2.RefreshReport()
                RptViewer.ShowDialog()

            ElseIf Me.R4.Checked = True Then
                Dim rpt As New BalanceSheetL4
                rpt.SetDataSource(das)
                RptViewer.CrystalReportViewer2.ReportSource = rpt
                RptViewer.CrystalReportViewer2.RefreshReport()
                RptViewer.ShowDialog()
            End If

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            MsgBox(ex.ToString)
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
        End Try
    End Sub
End Class
