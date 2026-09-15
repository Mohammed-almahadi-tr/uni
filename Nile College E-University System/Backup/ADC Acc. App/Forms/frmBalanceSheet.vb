Imports System.Data.SqlClient

Public Class frmBalanceSheet
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
    Friend WithEvents GroupBox3 As System.Windows.Forms.GroupBox
    Friend WithEvents Timer4 As System.Windows.Forms.Timer
    Friend WithEvents Timer5 As System.Windows.Forms.Timer
    Friend WithEvents Timer3 As System.Windows.Forms.Timer
    Friend WithEvents Button3 As System.Windows.Forms.Button
    Friend WithEvents Button4 As System.Windows.Forms.Button
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents ProgressBar1 As System.Windows.Forms.ProgressBar
    Friend WithEvents DateTimePicker1 As System.Windows.Forms.DateTimePicker
    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        Me.components = New System.ComponentModel.Container
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmBalanceSheet))
        Me.GroupBox3 = New System.Windows.Forms.GroupBox
        Me.DateTimePicker1 = New System.Windows.Forms.DateTimePicker
        Me.Timer4 = New System.Windows.Forms.Timer(Me.components)
        Me.Timer5 = New System.Windows.Forms.Timer(Me.components)
        Me.Timer3 = New System.Windows.Forms.Timer(Me.components)
        Me.Button3 = New System.Windows.Forms.Button
        Me.Button4 = New System.Windows.Forms.Button
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.ProgressBar1 = New System.Windows.Forms.ProgressBar
        Me.GroupBox3.SuspendLayout()
        Me.SuspendLayout()
        '
        'GroupBox3
        '
        Me.GroupBox3.Controls.Add(Me.DateTimePicker1)
        Me.GroupBox3.Location = New System.Drawing.Point(6, 5)
        Me.GroupBox3.Name = "GroupBox3"
        Me.GroupBox3.Size = New System.Drawing.Size(220, 46)
        Me.GroupBox3.TabIndex = 5
        Me.GroupBox3.TabStop = False
        Me.GroupBox3.Text = "«· «—ÌŒ"
        '
        'DateTimePicker1
        '
        Me.DateTimePicker1.Location = New System.Drawing.Point(10, 19)
        Me.DateTimePicker1.Name = "DateTimePicker1"
        Me.DateTimePicker1.Size = New System.Drawing.Size(200, 20)
        Me.DateTimePicker1.TabIndex = 29
        '
        'Button3
        '
        Me.Button3.Location = New System.Drawing.Point(26, 106)
        Me.Button3.Name = "Button3"
        Me.Button3.Size = New System.Drawing.Size(75, 32)
        Me.Button3.TabIndex = 7
        Me.Button3.Text = "≈€·«ﬁ"
        '
        'Button4
        '
        Me.Button4.Location = New System.Drawing.Point(131, 106)
        Me.Button4.Name = "Button4"
        Me.Button4.Size = New System.Drawing.Size(75, 32)
        Me.Button4.TabIndex = 6
        Me.Button4.Text = "⁄—÷ "
        '
        'GroupBox1
        '
        Me.GroupBox1.Location = New System.Drawing.Point(6, 96)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(220, 4)
        Me.GroupBox1.TabIndex = 11
        Me.GroupBox1.TabStop = False
        '
        'ProgressBar1
        '
        Me.ProgressBar1.Location = New System.Drawing.Point(6, 56)
        Me.ProgressBar1.Name = "ProgressBar1"
        Me.ProgressBar1.Size = New System.Drawing.Size(220, 36)
        Me.ProgressBar1.Style = System.Windows.Forms.ProgressBarStyle.Marquee
        Me.ProgressBar1.TabIndex = 17
        Me.ProgressBar1.Visible = False
        '
        'frmBalanceSheet
        '
        Me.AutoScaleBaseSize = New System.Drawing.Size(5, 13)
        Me.ClientSize = New System.Drawing.Size(232, 144)
        Me.Controls.Add(Me.ProgressBar1)
        Me.Controls.Add(Me.GroupBox1)
        Me.Controls.Add(Me.Button3)
        Me.Controls.Add(Me.Button4)
        Me.Controls.Add(Me.GroupBox3)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(240, 178)
        Me.MinimumSize = New System.Drawing.Size(240, 178)
        Me.Name = "frmBalanceSheet"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.SizeGripStyle = System.Windows.Forms.SizeGripStyle.Hide
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "«·„Ì“«‰Ì…"
        Me.GroupBox3.ResumeLayout(False)
        Me.ResumeLayout(False)

    End Sub

#End Region


    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Me.Close()
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Try
            Me.ProgressBar1.Visible = True
            Me.Cursor = Cursors.WaitCursor
            'Dim D As DateTime = Me.DateTimePicker1.Value.ToShortDateString
            'Dim Value As Double
            'Dim Package, Type As String

            ''Data
            'Dim das As New DataSet

            'das.DataSetName = "Transactions"
            'das.Tables.Add("Transactions")

            'das.Tables(0).Columns.Add("Mindate")
            'das.Tables(0).Columns.Add("Package")
            'das.Tables(0).Columns.Add("CustName")
            'das.Tables(0).Columns.Add("MahfName")
            'das.Tables(0).Columns.Add("TotalValueIn", GetType(Double))

            ''Fill Fields
            'Dim Row1 As String() = {D, "«·√’Ê· «·„‰ŸÊ—…", "«·√’Ê· «·À«» …", "«·√’Ê·", -1 * CDbl(GetPackAssets(D))}
            'das.Tables(0).Rows.Add(Row1)

            'Dim Row2 As String() = {D, "„’—Ê›«  «· √”Ì”", "«·√’Ê· «·À«» …", "«·√’Ê·", -1 * _
            '                          (CDbl(CDbl(GetSAccBalance("«·√’Ê· «·À«» …", "„’—Ê›«  «· √”Ì”", D)) + _
            '                          CDbl(GetSAccBalance("«·√’Ê· «·À«» …", "„Ã„⁄ ≈Â·«ﬂ „’—Ê›«  «· √”Ì”", D))))}
            'das.Tables(0).Rows.Add(Row2)

            'Dim Row3 As String() = {D, "„œÌ‰Ê‰", "«·√’Ê· «·„ œ«Ê·…", "«·√’Ê·", -1 * CDbl(GetPackBalance("„œÌ‰Ê‰", (D)))}
            'das.Tables(0).Rows.Add(Row3)

            'Dim Row4 As String() = {D, "‰ﬁœÌ… »«·»‰Êﬂ", "«·√’Ê· «·„ œ«Ê·…", "«·√’Ê·", -1 * CDbl(GetAccBalance("«·√’Ê· «·„ œ«Ê·…", "Õ”«»«  «·»‰Êﬂ", D))}
            'das.Tables(0).Rows.Add(Row4)

            'Dim Row5 As String() = {D, "‰ﬁœÌ… »«·Œ“Ì‰…", "«·√’Ê· «·„ œ«Ê·…", "«·√’Ê·", -1 * CDbl(GetAccBalance("«·√’Ê· «·„ œ«Ê·…", "«·Œ“Ì‰…", D))}
            'das.Tables(0).Rows.Add(Row5)

            ''--------
            'Dim Row6 As String() = {D, "—√” «·„«· «·„œ›Ê⁄", "ÕﬁÊﬁ «·„·ﬂÌ…", "«·Œ’Ê„", CDbl(GetAccBalance("ÕﬁÊﬁ «·„·ﬂÌ…", "—√” «·„«·", D))}
            'das.Tables(0).Rows.Add(Row6)

            'Dim Row7 As String() = {D, "«·√—»«Õ «·„—Õ·…", "ÕﬁÊﬁ «·„·ﬂÌ…", "«·Œ’Ê„", CDbl(GetAccBalance("ÕﬁÊﬁ «·„·ﬂÌ…", "«·√—»«Õ „Õ Ã“…", D))}
            'das.Tables(0).Rows.Add(Row7)

            'Dim Row8 As String() = {D, "√—»«Õ «·› —…", "ÕﬁÊﬁ «·„·ﬂÌ…", "«·Œ’Ê„", CDbl(GetPackBalance("«·√—»«Õ Ê«·Œ”«∆—", (D)))}
            'das.Tables(0).Rows.Add(Row8)

            'Dim Row9 As String() = {D, "œ«∆‰Ê‰", "«·Œ’Ê„ «·„ œ«Ê·…", "«·Œ’Ê„", CDbl(GetPackBalance("œ«∆‰Ê‰", (D)))}
            'das.Tables(0).Rows.Add(Row9)

            'Dim dap As New SqlDataAdapter("(Select N'" & Me.DateTimePicker1.Value.ToString & "' Mindate,SubAcc Package," & _
            '              "Sum(TotalValueIn)-Sum(TotalValueOut) TotalValueIn,Case When Sum(TotalValueIn)-Sum(TotalValueOut) > 0 Then '«·Œ’Ê„' " & _
            '              "Else '«·√’Ê·' End MahfName " & _
            '              "From Transactions Where Acc<>N'«·√—»«Õ Ê«·Œ”«∆—' and " & _
            '              "TransDate<N'" & Me.DateTimePicker1.Value.ToShortDateString & " 23:23:59' and Done=1 " & _
            '              "Group By Acc,SubAcc) " & _
            '              "Union All " & _
            '              "(Select N'" & Me.DateTimePicker1.Value.ToString & "' Mindate,N'√—»«Õ «·› —…' Package," & _
            '              "Sum(TotalValueIn)-Sum(TotalValueOut) TotalValueIn,Case When Sum(TotalValueIn)-Sum(TotalValueOut) > 0 Then '«·Œ’Ê„' " & _
            '              "Else '«·√’Ê·' End MahfName " & _
            '              "From Transactions Where Acc=N'«·√—»«Õ Ê«·Œ”«∆—' and Done=1 and " & _
            '              "TransDate<N'" & Me.DateTimePicker1.Value.ToShortDateString & " 23:23:59')", cnn)

            Dim dap As New SqlDataAdapter("Select N'" & Me.DateTimePicker1.Value.ToString & "' Mindate,Package," & _
                          "Sum(TotalValueIn)-Sum(TotalValueOut) TotalValueIn,Case When Sum(TotalValueIn)-Sum(TotalValueOut) > 0 Then '«·Œ’Ê„' " & _
                          "Else '«·√’Ê·' End MahfName " & _
                          "From Transactions Where Package Is Not Null and Package<>N'' and " & _
                          "TransDate<N'" & Me.DateTimePicker1.Value.ToShortDateString & " 23:23:59' and Done=1 " & _
                          "Group By Package", cnn)

            Dim das As New DataSet

            cnn.Open()
            dap.Fill(das, "Transactions")
            cnn.Close()

            Dim rpt As New BalanceSheet
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer2.ReportSource = rpt
            RptViewer.CrystalReportViewer2.RefreshReport()
            RptViewer.ShowDialog()
            Me.Cursor = Cursors.Default

            Me.ProgressBar1.Visible = False
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            Me.ProgressBar1.Visible = False
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
        Me.Cursor = Cursors.Default
    End Sub

    Function GetPackBalance(ByVal PackName As String, ByVal D As String) As Double
        Try
            Dim X As Double
            Dim cmd As New SqlCommand("Select Case When Sum(TotalValueIn)-Sum(TotalValueOut) is Null Then 0 " & _
                                      " Else Sum(TotalValueIn)-Sum(TotalValueOut) End From Transactions " & _
                                      "Where Package=N'" & PackName & "' and TransDate<N'" & D & " 23:59:59' and Done=1", cnn)
            cnn.Open()
            X = CDbl(cmd.ExecuteScalar)
            cnn.Close()

            Return X
        Catch ex As Exception
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function

    Function GetPackAssets(ByVal D As String) As Double
        Try
            Dim X As Double
            Dim cmd As New SqlCommand("Select Case When Sum(TotalValueIn)-Sum(TotalValueOut) is Null Then 0 " & _
                                      "            Else Sum(TotalValueIn)-Sum(TotalValueOut) End From Transactions " & _
                                      "Where Package=N'«·√’Ê· «·À«» …' and SubAcc<>N'„’—Ê›«  «· √”Ì”' and SubAcc<>N'„Ã„⁄ ≈Â·«ﬂ „’—Ê›«  «· √”Ì”' " & _
                                      "and TransDate<N'" & D & " 23:59:59' and Done=1", cnn)
            cnn.Open()
            X = CDbl(cmd.ExecuteScalar)
            cnn.Close()

            Return X
        Catch ex As Exception
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function

    Function GetAccBalance(ByVal Pack As String, ByVal AccName As String, ByVal D As String) As Double
        Try
            Dim X As Double
            Dim cmd As New SqlCommand("Select Case When Sum(TotalValueIn)-Sum(TotalValueOut) is Null Then 0 " & _
                                      "            Else Sum(TotalValueIn)-Sum(TotalValueOut) End From Transactions " & _
                                      "Where Package=N'" & Pack & "' and Acc=N'" & AccName & "' and " & _
                                      "TransDate<N'" & D & " 23:59:59' and Done=1", cnn)
            cnn.Open()
            X = CDbl(cmd.ExecuteScalar)
            cnn.Close()

            Return X
        Catch ex As Exception
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function

    Function GetSAccBalance(ByVal Pack As String, ByVal AccName As String, ByVal D As String) As Double
        Try
            Dim X As Double
            Dim cmd As New SqlCommand("Select Case When Sum(TotalValueIn)-Sum(TotalValueOut) is Null Then 0 " & _
                                      "            Else Sum(TotalValueIn)-Sum(TotalValueOut) End From Transactions " & _
                                      "Where Package=N'" & Pack & "' and SubAcc=N'" & AccName & "' and " & _
                                      "TransDate<N'" & D & " 23:59:59' and Done=1", cnn)
            cnn.Open()
            X = CDbl(cmd.ExecuteScalar)
            cnn.Close()

            Return X
        Catch ex As Exception
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Me.Close()
    End Sub
End Class
